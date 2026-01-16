#!/bin/bash
# Auto-open YouTube Clips on macOS
# Double-click this file to automatically open the app

APP_PATH="/Applications/YouTube Clips.app"

if [ ! -d "$APP_PATH" ]; then
    osascript -e 'display dialog "YouTube Clips not found in Applications folder.\n\nPlease install the app first by dragging it to Applications." buttons {"OK"} default button 1 with icon caution'
    exit 1
fi

# Remove quarantine
xattr -cr "$APP_PATH" 2>/dev/null

# Open the app
open "$APP_PATH"

# Show success message
osascript -e 'display notification "YouTube Clips is now opening..." with title "YouTube Clips"'
