import { ipcMain, app } from 'electron';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const isDev = !app.isPackaged;

// Get the path to the yt-dlp binary
function getYtdlpPath(): string {
  const platform = os.platform();
  const binName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

  if (isDev) {
    // In development, use the resources folder in the project
    const devPath = path.join(process.cwd(), 'resources', 'bin', platform === 'darwin' ? 'mac' : 'win', binName);
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    // Fallback to system yt-dlp
    return 'yt-dlp';
  }

  // In production, use the bundled binary
  return path.join(process.resourcesPath, 'bin', binName);
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  url: string;
  formats: Array<{
    formatId: string;
    ext: string;
    resolution: string;
    filesize: number;
  }>;
}

export function setupYtdlpHandlers() {
  const ytdlpPath = getYtdlpPath();

  // Get video information
  ipcMain.handle('ytdlp:getInfo', async (_, url: string): Promise<VideoInfo> => {
    return new Promise((resolve, reject) => {
      const videoId = extractVideoId(url);
      if (!videoId) {
        reject(new Error('Invalid YouTube URL'));
        return;
      }

      console.log('[ytdlp] Getting info for:', url);
      console.log('[ytdlp] Using binary:', ytdlpPath);

      const args = [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        url
      ];

      const ytdlp = spawn(ytdlpPath, args);
      let stdout = '';
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[ytdlp] stderr:', data.toString());
      });

      ytdlp.on('close', (code) => {
        console.log('[ytdlp] Process closed with code:', code);
        if (code !== 0) {
          console.error('[ytdlp] Error:', stderr);
          reject(new Error(`yt-dlp failed: ${stderr}`));
          return;
        }

        try {
          const info = JSON.parse(stdout);
          console.log('[ytdlp] Got video info:', info.title);
          resolve({
            id: info.id,
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            url: info.url || info.webpage_url,
            formats: (info.formats || []).slice(-10).map((f: Record<string, unknown>) => ({
              formatId: f.format_id,
              ext: f.ext,
              resolution: f.resolution || `${f.width}x${f.height}`,
              filesize: f.filesize || 0,
            })),
          });
        } catch (e) {
          console.error('[ytdlp] Failed to parse:', e);
          reject(new Error('Failed to parse video info'));
        }
      });

      ytdlp.on('error', (err) => {
        console.error('[ytdlp] Spawn error:', err);
        reject(new Error(`Failed to run yt-dlp: ${err.message}`));
      });
    });
  });

  // Get direct stream URL (progressive, non-HLS)
  ipcMain.handle('ytdlp:getStreamUrl', async (_, url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('[ytdlp] Getting stream URL for:', url);

      // Request progressive formats only (not HLS/DASH)
      const args = [
        '-f', 'best[protocol^=http][ext=mp4]/best[protocol^=http]/best',
        '-g',
        '--no-playlist',
        '--youtube-skip-dash-manifest',
        url
      ];

      const ytdlp = spawn(ytdlpPath, args);
      let stdout = '';
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[ytdlp] Stream stderr:', data.toString().trim());
      });

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          console.error('[ytdlp] Stream URL error:', stderr);
          reject(new Error(`yt-dlp failed: ${stderr}`));
          return;
        }
        const streamUrl = stdout.trim().split('\n')[0];
        console.log('[ytdlp] Got stream URL (progressive)');
        resolve(streamUrl);
      });

      ytdlp.on('error', (err) => {
        console.error('[ytdlp] Stream spawn error:', err);
        reject(new Error(`Failed to run yt-dlp: ${err.message}`));
      });
    });
  });

  // Download video to a file
  ipcMain.handle('ytdlp:download', async (_, url: string, outputPath: string, options?: {
    format?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const args = [
        '-f', options?.format || 'best[ext=mp4]/best',
        '-o', outputPath,
        '--no-playlist',
      ];

      // Add time range if specified (using external downloader with ffmpeg)
      if (options?.startTime !== undefined || options?.endTime !== undefined) {
        const sections = [];
        if (options.startTime !== undefined) {
          sections.push(`*${options.startTime}-`);
        }
        if (options.endTime !== undefined) {
          sections[sections.length - 1] = sections[sections.length - 1] + `${options.endTime}`;
        }
        args.push('--download-sections', sections.join(','));
        args.push('--force-keyframes-at-cuts');
      }

      args.push(url);

      const ytdlp = spawn(ytdlpPath, args);
      let stderr = '';

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Download failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      ytdlp.on('error', (err) => {
        reject(new Error(`Failed to run yt-dlp: ${err.message}`));
      });
    });
  });

  // Download video to temp directory and return path
  ipcMain.handle('ytdlp:downloadTemp', async (event, url: string, options?: {
    format?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const tempDir = app.getPath('temp');
      const videoId = extractVideoId(url) || Date.now().toString();
      // Use unique timestamp to avoid cache issues
      const uniqueId = `${videoId}_${Date.now()}`;
      const outputPath = path.join(tempDir, `ytclips_${uniqueId}.mp4`);

      console.log('[ytdlp] Downloading to:', outputPath);
      if (options?.startTime !== undefined || options?.endTime !== undefined) {
        console.log('[ytdlp] Time range:', options.startTime, '-', options.endTime);
      }

      const args = [
        '-f', options?.format || 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '-o', outputPath,
        '--no-playlist',
        '--no-warnings',
        '--newline',
        '--progress',
        '--merge-output-format', 'mp4',
        '--force-overwrites',  // Force overwrite if file exists
      ];

      // Add time range if specified (download only the clip section)
      if (options?.startTime !== undefined && options?.endTime !== undefined) {
        args.push('--download-sections', `*${options.startTime}-${options.endTime}`);
        args.push('--force-keyframes-at-cuts');
      }

      args.push(url);

      const ytdlp = spawn(ytdlpPath, args);
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('[ytdlp] Download progress:', output);

        // Parse progress from yt-dlp output
        // Example: [download]  45.2% of 123.45MiB at 1.23MiB/s ETA 00:45
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/);
        const etaMatch = output.match(/ETA\s+([\d:]+)/);

        if (progressMatch) {
          const progress = {
            percent: parseFloat(progressMatch[1]),
            speed: speedMatch ? speedMatch[1] : '',
            eta: etaMatch ? etaMatch[1] : '',
          };
          event.sender.send('ytdlp:progress', progress);
        }
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
        const output = data.toString().trim();
        console.log('[ytdlp] Download stderr:', output);

        // yt-dlp also outputs progress to stderr sometimes
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        const speedMatch = output.match(/at\s+([\d.]+\w+\/s)/);
        const etaMatch = output.match(/ETA\s+([\d:]+)/);

        if (progressMatch) {
          const progress = {
            percent: parseFloat(progressMatch[1]),
            speed: speedMatch ? speedMatch[1] : '',
            eta: etaMatch ? etaMatch[1] : '',
          };
          event.sender.send('ytdlp:progress', progress);
        }
      });

      ytdlp.on('close', (code) => {
        console.log('[ytdlp] Download finished with code:', code);
        if (code !== 0) {
          console.error('[ytdlp] Download error:', stderr);
          reject(new Error(`Download failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      ytdlp.on('error', (err) => {
        console.error('[ytdlp] Download spawn error:', err);
        reject(new Error(`Failed to run yt-dlp: ${err.message}`));
      });
    });
  });

  // Check if yt-dlp is available
  ipcMain.handle('ytdlp:checkAvailable', async (): Promise<boolean> => {
    return new Promise((resolve) => {
      exec(`"${ytdlpPath}" --version`, (error) => {
        resolve(!error);
      });
    });
  });
}
