import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const CAPTION_API_URL = process.env.VITE_CAPTION_API_URL || 'https://api-x.subscut.com';

export interface Caption {
  start: number;
  end: number;
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export function setupCaptionHandlers() {
  // Generate captions from a video file
  ipcMain.handle('captions:generate', async (_, filePath: string, token: string): Promise<Caption[]> => {
    return new Promise((resolve, reject) => {
      console.log('[captions] Generating captions for:', filePath);
      console.log('[captions] API URL:', CAPTION_API_URL);

      // Read the file
      if (!fs.existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
        return;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      // Create multipart form data with maxWords and maxLines
      const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
      const CRLF = '\r\n';

      // Add video file
      const videoHeader = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="video"; filename="${fileName}"`,
        'Content-Type: video/mp4',
        '',
        '',
      ].join(CRLF);

      // Add maxWords field
      const maxWordsField = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="maxWords"',
        '',
        '2',
      ].join(CRLF);

      // Add maxLines field
      const maxLinesField = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="maxLines"',
        '',
        '1',
      ].join(CRLF);

      const footer = CRLF + `--${boundary}--` + CRLF;

      const videoHeaderBuffer = Buffer.from(videoHeader, 'utf-8');
      const maxWordsBuffer = Buffer.from(CRLF + maxWordsField, 'utf-8');
      const maxLinesBuffer = Buffer.from(CRLF + maxLinesField, 'utf-8');
      const footerBuffer = Buffer.from(footer, 'utf-8');

      const body = Buffer.concat([videoHeaderBuffer, fileBuffer, maxWordsBuffer, maxLinesBuffer, footerBuffer]);

      const url = new URL(`${CAPTION_API_URL}/generate-captions`);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
          'Authorization': `Bearer ${token}`,
        },
      };

      console.log('[captions] Sending request to:', url.href);
      console.log('[captions] File size:', (fileBuffer.length / 1024 / 1024).toFixed(2), 'MB');

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('[captions] Response status:', res.statusCode);
          console.log('[captions] Response data:', data.substring(0, 500));

          if (res.statusCode !== 200) {
            try {
              const errorData = JSON.parse(data);
              reject(new Error(errorData.error || `API error: ${res.statusCode}`));
            } catch {
              reject(new Error(`API error: ${res.statusCode} - ${data}`));
            }
            return;
          }

          try {
            const result = JSON.parse(data);
            if (result.captions) {
              console.log('[captions] Got captions:', result.captions.length);
              resolve(result.captions);
            } else {
              reject(new Error('Invalid response: no captions field'));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e}`));
          }
        });
      });

      // Set timeout to 10 minutes for large files
      req.setTimeout(600000, () => {
        req.destroy();
        reject(new Error('Request timeout - video file may be too large. Try a shorter clip (under 60 seconds recommended).'));
      });

      req.on('error', (err) => {
        console.error('[captions] Request error:', err);
        if (err.message.includes('EPIPE')) {
          reject(new Error('Connection lost - video file may be too large. Try a shorter clip.'));
        } else {
          reject(new Error(`Network error: ${err.message}`));
        }
      });

      req.write(body);
      req.end();
    });
  });
}
