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
echo "Note: FFmpeg for macOS needs to be downloaded manually from https://evermeet.cx/ffmpeg/"
echo "Place the 'ffmpeg' binary in: $RESOURCES_DIR/mac/ffmpeg"
echo ""
echo "Quick commands for macOS FFmpeg:"
echo "  curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o /tmp/ffmpeg-mac.zip"
echo "  unzip /tmp/ffmpeg-mac.zip -d $RESOURCES_DIR/mac/"
echo "  chmod +x $RESOURCES_DIR/mac/ffmpeg"

# Attempt automatic download for macOS
if command -v brew &> /dev/null; then
    echo ""
    echo "Homebrew detected. You can also install ffmpeg system-wide with:"
    echo "  brew install ffmpeg"
fi

# Windows FFmpeg
echo ""
echo "For Windows FFmpeg:"
echo "  1. Download from https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
echo "  2. Extract and copy ffmpeg.exe to: $RESOURCES_DIR/win/ffmpeg.exe"

echo ""
echo "=== Summary ==="
echo "Binary locations:"
echo "  macOS yt-dlp:  $RESOURCES_DIR/mac/yt-dlp"
echo "  macOS FFmpeg:  $RESOURCES_DIR/mac/ffmpeg (manual download required)"
echo "  Windows yt-dlp: $RESOURCES_DIR/win/yt-dlp.exe"
echo "  Windows FFmpeg: $RESOURCES_DIR/win/ffmpeg.exe (manual download required)"
echo ""
echo "Done!"
