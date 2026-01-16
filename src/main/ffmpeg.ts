import { ipcMain, app } from 'electron';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { generateASS, colorToASS, type SubtitleStyle as ASSStyle } from './srt';

const isDev = !app.isPackaged;

// Get the path to the ffmpeg binary
function getFfmpegPath(): string {
  const platform = os.platform();
  const binName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  if (isDev) {
    // In development, use the resources folder in the project
    const devPath = path.join(process.cwd(), 'resources', 'bin', platform === 'darwin' ? 'mac' : 'win', binName);
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    // Fallback to system ffmpeg
    return 'ffmpeg';
  }

  // In production, use the bundled binary
  return path.join(process.resourcesPath, 'bin', binName);
}

export function setupFfmpegHandlers() {
  const ffmpegPath = getFfmpegPath();

  // Trim video to a specific time range
  ipcMain.handle('ffmpeg:trim', async (_, inputPath: string, startTime: number, endTime: number, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;

      const args = [
        '-y', // Overwrite output file
        '-ss', startTime.toString(),
        '-i', inputPath,
        '-t', duration.toString(),
        '-c', 'copy', // Copy without re-encoding (fast)
        '-avoid_negative_ts', 'make_zero',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg trim failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg: ${err.message}`));
      });
    });
  });

  // Trim video with re-encoding (more accurate but slower)
  ipcMain.handle('ffmpeg:trimAccurate', async (_, inputPath: string, startTime: number, endTime: number, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;

      const args = [
        '-y',
        '-ss', startTime.toString(),
        '-i', inputPath,
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg trim failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg: ${err.message}`));
      });
    });
  });

  // Convert video to GIF
  ipcMain.handle('ffmpeg:toGif', async (_, inputPath: string, outputPath: string, options?: {
    width?: number;
    fps?: number;
  }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const width = options?.width || 480;
      const fps = options?.fps || 15;

      // Two-pass GIF conversion for better quality
      const paletteFile = path.join(app.getPath('temp'), `palette_${Date.now()}.png`);

      // Generate palette
      const paletteArgs = [
        '-y',
        '-i', inputPath,
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
        paletteFile
      ];

      const palette = spawn(ffmpegPath, paletteArgs);
      let paletteStderr = '';

      palette.stderr.on('data', (data) => {
        paletteStderr += data.toString();
      });

      palette.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Palette generation failed: ${paletteStderr}`));
          return;
        }

        // Generate GIF using palette
        const gifArgs = [
          '-y',
          '-i', inputPath,
          '-i', paletteFile,
          '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
          outputPath
        ];

        const gif = spawn(ffmpegPath, gifArgs);
        let gifStderr = '';

        gif.stderr.on('data', (data) => {
          gifStderr += data.toString();
        });

        gif.on('close', (gifCode) => {
          // Clean up palette file
          try {
            fs.unlinkSync(paletteFile);
          } catch {
            // Ignore cleanup errors
          }

          if (gifCode !== 0) {
            reject(new Error(`GIF conversion failed: ${gifStderr}`));
            return;
          }
          resolve(outputPath);
        });

        gif.on('error', (err) => {
          reject(new Error(`Failed to run FFmpeg for GIF: ${err.message}`));
        });
      });

      palette.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg for palette: ${err.message}`));
      });
    });
  });

  // Add subtitles to video (burn-in)
  ipcMain.handle('ffmpeg:addSubtitles', async (_, inputPath: string, srtPath: string, outputPath: string, options?: {
    fontName?: string;
    fontSize?: number;
    fontColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
  }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fontName = options?.fontName || 'Arial';
      const fontSize = options?.fontSize || 24;
      const fontColor = options?.fontColor || '&HFFFFFF';
      const outlineColor = options?.outlineColor || '&H000000';
      const outlineWidth = options?.outlineWidth || 2;

      const subtitleFilter = `subtitles=${srtPath.replace(/\\/g, '/').replace(/:/g, '\\:')}:force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=${fontColor},OutlineColour=${outlineColor},Outline=${outlineWidth}'`;

      const args = [
        '-y',
        '-i', inputPath,
        '-vf', subtitleFilter,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-c:a', 'copy',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Subtitle burn-in failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg: ${err.message}`));
      });
    });
  });

  // Get video duration
  ipcMain.handle('ffmpeg:getDuration', async (_, inputPath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
      const args = [
        '-i', inputPath,
        '-show_entries', 'format=duration',
        '-v', 'quiet',
        '-of', 'csv=p=0'
      ];

      const ffprobe = spawn(ffprobePath, args);
      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed: ${stderr}`));
          return;
        }
        const duration = parseFloat(stdout.trim());
        resolve(isNaN(duration) ? 0 : duration);
      });

      ffprobe.on('error', (err) => {
        reject(new Error(`Failed to run FFprobe: ${err.message}`));
      });
    });
  });

  // Check if FFmpeg is available
  ipcMain.handle('ffmpeg:checkAvailable', async (): Promise<boolean> => {
    return new Promise((resolve) => {
      exec(`"${ffmpegPath}" -version`, (error) => {
        resolve(!error);
      });
    });
  });

  // Convert WebM to MP4
  ipcMain.handle('ffmpeg:webmToMp4', async (_, inputPath: string, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`WebM to MP4 conversion failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg: ${err.message}`));
      });
    });
  });

  // Convert video to 9:16 aspect ratio for shorts/reels
  ipcMain.handle('ffmpeg:convertTo916', async (_, inputPath: string, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Crop to 9:16 aspect ratio (portrait) by cropping from center
      // Input is typically 16:9 (1920x1080), output should be 9:16 (1080x1920)
      const args = [
        '-y',
        '-i', inputPath,
        '-vf', 'crop=ih*9/16:ih,scale=1080:1920,setsar=1',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-c:a', 'copy',
        outputPath
      ];

      console.log('[FFmpeg] Converting to 9:16:', args.join(' '));

      const ffmpeg = spawn(ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[FFmpeg]', data.toString().trim());
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error('[FFmpeg] 9:16 conversion error:', stderr);
          reject(new Error(`9:16 conversion failed: ${stderr}`));
          return;
        }
        console.log('[FFmpeg] 9:16 conversion successful');
        resolve(outputPath);
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg: ${err.message}`));
      });
    });
  });

  // Burn styled subtitles using drawtext filter (supports real blur/glow effects)
  ipcMain.handle('ffmpeg:burnSubtitles', async (_, inputPath: string, captions: Array<{start: number; end: number; text: string; words?: Array<{word: string; start: number; end: number}>}>, style: ASSStyle, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('[FFmpeg] Burning subtitles with drawtext (word-by-word)');
      console.log('[FFmpeg] Style:', style);

      // Get font path with font name mapping
      const platform = os.platform();
      const fontDir = isDev
        ? path.join(process.cwd(), 'resources', 'fonts')
        : path.join(process.resourcesPath, 'fonts');

      // Map font names to actual font files
      const fontFileMap: Record<string, string> = {
        'Komika': 'KOMIKAX_.ttf',
        'Montserrat': 'Montserrat-VariableFont_wght.ttf',
        'Arial': 'Arial',  // System font
      };

      const fontFileName = fontFileMap[style.fontName] || `${style.fontName}.ttf`;
      const fontPath = path.join(fontDir, fontFileName);
      console.log('[FFmpeg] Font path:', fontPath);
      console.log('[FFmpeg] Font exists:', fs.existsSync(fontPath));

      // Build drawtext filters for each caption
      const filters: string[] = [];

      // Convert ASS colors once
      const primaryColor = convertASSColorToHex(style.primaryColor);
      const outlineColor = convertASSColorToHex(style.outlineColor);
      const shadowColor = style.shadowColor ? convertASSColorToHex(style.shadowColor) : '#FFFFFF';
      const hasShadow = style.shadowBlur && style.shadowBlur > 0;

      captions.forEach((caption, captionIndex) => {
        // Check if we have word timing data
        if (!caption.words || caption.words.length === 0) {
          console.log(`[FFmpeg] Caption ${captionIndex}: No word timing, showing full text`);
          // No word timing, show full caption text
          let text = caption.text;
          if (style.uppercase) {
            text = text.toUpperCase();
          }
          text = text.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:').replace(/%/g, '\\%');

          addDrawtextLayers(filters, text, caption.start, caption.end, fontPath, primaryColor, outlineColor, shadowColor, style, hasShadow);
        } else {
          // Word-by-word rendering with 2-word chunks (like preview)
          const wordsPerChunk = 2;  // Beast style shows 2 words at a time
          const totalWords = caption.words.length;
          console.log(`[FFmpeg] Caption ${captionIndex}: Has ${totalWords} words, creating ${Math.ceil(totalWords / wordsPerChunk)} chunks`);

          // Create chunks of 2 words
          for (let chunkIndex = 0; chunkIndex < Math.ceil(totalWords / wordsPerChunk); chunkIndex++) {
            const chunkStart = chunkIndex * wordsPerChunk;
            const chunkEnd = Math.min(chunkStart + wordsPerChunk, totalWords);
            const chunkWords = caption.words.slice(chunkStart, chunkEnd);

            // Get timing for this chunk (start of first word, end of last word in chunk)
            const chunkStartTime = chunkWords[0].start;
            const chunkEndTime = chunkWords[chunkWords.length - 1].end;

            // Build text for this chunk
            let chunkText = chunkWords.map(w => w.word).join(' ');
            if (style.uppercase) {
              chunkText = chunkText.toUpperCase();
            }
            const escapedText = chunkText.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:').replace(/%/g, '\\%');

            console.log(`[FFmpeg]   Chunk ${chunkIndex}: "${chunkText}" (${chunkStartTime.toFixed(2)}s - ${chunkEndTime.toFixed(2)}s)`);

            // Add layers for this chunk
            addDrawtextLayers(filters, escapedText, chunkStartTime, chunkEndTime, fontPath, primaryColor, outlineColor, shadowColor, style, hasShadow);
          }
        }
      });

      const filterComplex = filters.join(',');

      const args = [
        '-y',
        '-i', inputPath,
        '-vf', filterComplex,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-c:a', 'copy',
        outputPath
      ];

      console.log('[FFmpeg] Running drawtext command with', filters.length, 'filters');

      const ffmpeg = spawn(ffmpegPath, args);
      let stderr = '';

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error('[FFmpeg] Error:', stderr);
          reject(new Error(`Subtitle burn-in failed: ${stderr}`));
          return;
        }
        console.log('[FFmpeg] Subtitles burned successfully with drawtext');
        resolve(outputPath);
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`Failed to run FFmpeg: ${err.message}`));
      });
    });
  });
}

// Helper: Add drawtext layers for glow + main text
function addDrawtextLayers(
  filters: string[],
  text: string,
  startTime: number,
  endTime: number,
  fontPath: string,
  primaryColor: string,
  outlineColor: string,
  shadowColor: string,
  style: { fontSize: number; outlineWidth: number; shadowBlur?: number; captionYPosition?: number },
  hasShadow: boolean
) {
  // Use custom Y position if provided, otherwise default to fontSize * 2 from bottom
  const yPosition = style.captionYPosition || (style.fontSize * 2);

  if (hasShadow && style.shadowBlur && style.shadowBlur > 0) {
    // First layer: Glow effect (thicker white border)
    const glowParams = [
      `fontfile='${fontPath}'`,
      `text='${text}'`,
      `fontcolor=${primaryColor}`,
      `fontsize=${style.fontSize}`,
      `x=(w-text_w)/2`,
      `y=h-${yPosition}`,
      `borderw=${style.outlineWidth + Math.round(style.shadowBlur * 0.4)}`,  // Reduced glow thickness
      `bordercolor=${shadowColor}@0.5`,  // Reduced opacity for subtler glow
      `enable='between(t,${startTime},${endTime})'`
    ];
    filters.push(`drawtext=${glowParams.join(':')}`);
  }

  // Main text layer: White text with black outline
  const mainParams = [
    `fontfile='${fontPath}'`,
    `text='${text}'`,
    `fontcolor=${primaryColor}`,
    `fontsize=${style.fontSize}`,
    `x=(w-text_w)/2`,
    `y=h-${yPosition}`,
    `borderw=${style.outlineWidth}`,
    `bordercolor=${outlineColor}`,
    `enable='between(t,${startTime},${endTime})'`
  ];
  filters.push(`drawtext=${mainParams.join(':')}`);
}

// Helper: Convert ASS color format (&H00BBGGRR) to hex (#RRGGBB)
function convertASSColorToHex(assColor: string): string {
  // ASS format: &H00BBGGRR
  // Extract BBGGRR part
  const hex = assColor.replace('&H00', '');
  if (hex.length !== 6) return '#FFFFFF';

  // Swap from BBGGRR to RRGGBB
  const bb = hex.substr(0, 2);
  const gg = hex.substr(2, 2);
  const rr = hex.substr(4, 2);

  return `#${rr}${gg}${bb}`;
}
