#!/bin/bash
# Script to help macOS users open unsigned YouTube Clips app

APP_NAME="YouTube Clips.app"
APP_PATH="/Applications/$APP_NAME"

echo "YouTube Clips - macOS Unsigned App Helper"
echo "=========================================="
echo ""

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found at: $APP_PATH"
    echo ""
    echo "Please install the app first by:"
    echo "1. Opening the DMG file"
    echo "2. Dragging YouTube Clips to Applications folder"
    exit 1
fi

echo "✓ Found app at: $APP_PATH"
echo ""
echo "Removing quarantine attribute..."

# Remove quarantine attribute
xattr -cr "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✓ Successfully removed quarantine"
    echo ""
    echo "Opening YouTube Clips..."
    open "$APP_PATH"
else
    echo "❌ Failed to remove quarantine. You may need to run with sudo:"
    echo "   sudo bash $0"
    exit 1
fi
