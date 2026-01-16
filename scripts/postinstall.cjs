#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources', 'bin');
const MAC_DIR = path.join(RESOURCES_DIR, 'mac');
const WIN_DIR = path.join(RESOURCES_DIR, 'win');

// Binary download URLs
const BINARIES = {
  'yt-dlp-mac': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
  'yt-dlp-win': 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  // FFmpeg static builds
  'ffmpeg-mac': 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
  'ffmpeg-win': 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
};

// Create directories
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Download file with redirect support
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = (urlToFetch) => {
      const protocol = urlToFetch.startsWith('https') ? https : require('http');

      protocol.get(urlToFetch, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(err);
      });
    };

    request(url);
  });
}

// Download and extract zip
async function downloadAndExtractZip(url, destDir, binaryName) {
  const zipPath = path.join(destDir, 'temp.zip');

  console.log(`  Downloading ${binaryName}...`);
  await downloadFile(url, zipPath);

  console.log(`  Extracting ${binaryName}...`);

  // Use unzip command (available on macOS and most Linux)
  try {
    if (process.platform === 'darwin') {
      execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'pipe' });
      // Move the binary to the correct location
      const extractedFiles = fs.readdirSync(destDir);
      for (const file of extractedFiles) {
        if (file === binaryName || file.includes('ffmpeg')) {
          const srcPath = path.join(destDir, file);
          const destPath = path.join(destDir, binaryName);
          if (srcPath !== destPath && fs.statSync(srcPath).isFile()) {
            fs.renameSync(srcPath, destPath);
            break;
          }
        }
      }
    } else {
      // For Windows, we'll use PowerShell
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'pipe' });
    }

    // Cleanup
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  } catch (err) {
    console.error(`  Warning: Could not extract zip: ${err.message}`);
  }
}

async function main() {
  console.log('\\n=== Downloading binaries for YouTube Clips Desktop ===\\n');

  ensureDir(MAC_DIR);
  ensureDir(WIN_DIR);

  const platform = process.platform;

  try {
    // Download yt-dlp
    if (platform === 'darwin') {
      const ytdlpPath = path.join(MAC_DIR, 'yt-dlp');
      if (!fs.existsSync(ytdlpPath)) {
        console.log('Downloading yt-dlp for macOS...');
        await downloadFile(BINARIES['yt-dlp-mac'], ytdlpPath);
        fs.chmodSync(ytdlpPath, '755');
        console.log('  ✓ yt-dlp downloaded');
      } else {
        console.log('  ✓ yt-dlp already exists');
      }

      // Check for FFmpeg
      const ffmpegPath = path.join(MAC_DIR, 'ffmpeg');
      if (!fs.existsSync(ffmpegPath)) {
        // Try to use system ffmpeg first
        try {
          const systemFfmpeg = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
          if (systemFfmpeg) {
            console.log('Copying system FFmpeg...');
            // Use cp -L to follow symlinks
            execSync(`cp -L "${systemFfmpeg}" "${ffmpegPath}"`, { stdio: 'pipe' });
            fs.chmodSync(ffmpegPath, '755');
            console.log('  ✓ FFmpeg copied from system');
          }
        } catch {
          console.log('  ⚠ FFmpeg not found. Please install with: brew install ffmpeg');
        }
      } else {
        console.log('  ✓ FFmpeg already exists');
      }
    } else if (platform === 'win32') {
      const ytdlpPath = path.join(WIN_DIR, 'yt-dlp.exe');
      if (!fs.existsSync(ytdlpPath)) {
        console.log('Downloading yt-dlp for Windows...');
        await downloadFile(BINARIES['yt-dlp-win'], ytdlpPath);
        console.log('  ✓ yt-dlp downloaded');
      } else {
        console.log('  ✓ yt-dlp already exists');
      }

      const ffmpegPath = path.join(WIN_DIR, 'ffmpeg.exe');
      if (!fs.existsSync(ffmpegPath)) {
        console.log('Downloading FFmpeg for Windows (this may take a minute)...');
        const ffmpegZipUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
        const zipPath = path.join(WIN_DIR, 'ffmpeg-temp.zip');

        await downloadFile(ffmpegZipUrl, zipPath);
        console.log('  Extracting FFmpeg...');

        // Extract using tar (available in Windows 10+)
        try {
          execSync(`tar -xf "${zipPath}" -C "${WIN_DIR}"`, { stdio: 'pipe' });

          // Find and move ffmpeg.exe from nested directory
          const extractedDir = path.join(WIN_DIR, 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe');
          if (fs.existsSync(extractedDir)) {
            fs.renameSync(extractedDir, ffmpegPath);
          }

          // Cleanup
          fs.unlinkSync(zipPath);
          const tempDir = path.join(WIN_DIR, 'ffmpeg-master-latest-win64-gpl');
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }

          console.log('  ✓ FFmpeg downloaded');
        } catch (err) {
          console.error('  ⚠ Could not extract FFmpeg:', err.message);
          console.log('    Download manually from: https://github.com/BtbN/FFmpeg-Builds/releases');
        }
      } else {
        console.log('  ✓ FFmpeg already exists');
      }
    } else {
      console.log('Unsupported platform:', platform);
    }

    console.log('\\n=== Binary setup complete ===\\n');
  } catch (err) {
    console.error('Error downloading binaries:', err.message);
    console.log('\\nYou may need to download binaries manually.');
    console.log('Run: npm run download-binaries');
  }
}

main().catch(console.error);
