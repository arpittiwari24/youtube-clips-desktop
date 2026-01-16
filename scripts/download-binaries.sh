#!/bin/bash

# Script to download yt-dlp and ffmpeg binaries for macOS and Windows

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RESOURCES_DIR="$PROJECT_DIR/resources/bin"

echo "Creating binary directories..."
mkdir -p "$RESOURCES_DIR/mac"
mkdir -p "$RESOURCES_DIR/win"

echo ""
echo "=== Downloading yt-dlp ==="

# macOS yt-dlp
echo "Downloading yt-dlp for macOS..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o "$RESOURCES_DIR/mac/yt-dlp"
chmod +x "$RESOURCES_DIR/mac/yt-dlp"
echo "✓ yt-dlp for macOS downloaded"

# Windows yt-dlp
echo "Downloading yt-dlp for Windows..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o "$RESOURCES_DIR/win/yt-dlp.exe"
echo "✓ yt-dlp for Windows downloaded"

echo ""
echo "=== Downloading FFmpeg ==="

# macOS FFmpeg
echo "Downloading FFmpeg for macOS..."
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o /tmp/ffmpeg-mac.zip
unzip -q /tmp/ffmpeg-mac.zip -d /tmp/
mv /tmp/ffmpeg "$RESOURCES_DIR/mac/ffmpeg"
chmod +x "$RESOURCES_DIR/mac/ffmpeg"
rm /tmp/ffmpeg-mac.zip
echo "✓ FFmpeg for macOS downloaded"

# Windows FFmpeg
echo "Downloading FFmpeg for Windows..."
echo "  (This is a large file ~200MB, may take a minute...)"
curl -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -o /tmp/ffmpeg-win.zip
unzip -q /tmp/ffmpeg-win.zip -d /tmp/
mv /tmp/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe "$RESOURCES_DIR/win/ffmpeg.exe"
rm -rf /tmp/ffmpeg-win.zip /tmp/ffmpeg-master-latest-win64-gpl
echo "✓ FFmpeg for Windows downloaded"

echo ""
echo "=== Summary ==="
echo "✓ All binaries downloaded successfully:"
echo "  macOS yt-dlp:   $RESOURCES_DIR/mac/yt-dlp"
echo "  macOS FFmpeg:   $RESOURCES_DIR/mac/ffmpeg"
echo "  Windows yt-dlp: $RESOURCES_DIR/win/yt-dlp.exe"
echo "  Windows FFmpeg: $RESOURCES_DIR/win/ffmpeg.exe"
echo ""
echo "Done!"
