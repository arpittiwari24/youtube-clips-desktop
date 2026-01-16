# Release and Distribution Guide

## Auto-Update System Setup Complete! ✅

Your app now has automatic updates configured. Here's how to release and distribute it:

---

## 📋 One-Time Setup

### 1. Create GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/youtube-clips-desktop.git
git branch -M main
git push -u origin main
```

### 2. Update package.json

Replace `YOUR_GITHUB_USERNAME` in `package.json` (lines 79 and 109) with your actual GitHub username:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_ACTUAL_USERNAME",
  "repo": "youtube-clips-desktop"
}
```

### 3. Build Icons (if you haven't already)

- **macOS**: Place your app icon as `resources/icon.icns` (1024x1024 PNG converted to ICNS)
- **Windows**: Place your app icon as `resources/icon.ico` (256x256 PNG converted to ICO)

---

## 🚀 How to Release a New Version

### Step 1: Update Version Number

Edit `package.json` and bump the version:
```json
{
  "version": "1.0.1"  // Change this (follows semantic versioning)
}
```

### Step 2: Commit Changes

```bash
git add .
git commit -m "Release v1.0.1"
```

### Step 3: Create and Push Git Tag

```bash
# Create tag (must start with 'v')
git tag v1.0.1

# Push code and tag
git push origin main
git push origin v1.0.1
```

### Step 4: GitHub Actions Builds Automatically!

Once you push the tag, GitHub Actions will:
- ✅ Build for macOS (DMG and ZIP)
- ✅ Build for Windows (NSIS installer and Portable EXE)
- ✅ Upload all files to GitHub Releases
- ✅ Publish `latest.yml` for auto-updates

**Monitor progress**: Go to your GitHub repo → Actions tab

---

## 📥 Download Links for Your Landing Page

Once the first release is published, use these links:

### macOS Download
```html
<!-- Direct DMG download -->
<a href="https://github.com/YOUR_USERNAME/youtube-clips-desktop/releases/latest/download/YouTube-Clips-1.0.0-universal.dmg">
  Download for macOS
</a>

<!-- Or ZIP -->
<a href="https://github.com/YOUR_USERNAME/youtube-clips-desktop/releases/latest/download/YouTube-Clips-1.0.0-universal-mac.zip">
  Download for macOS (ZIP)
</a>
```

### Windows Download
```html
<!-- NSIS Installer -->
<a href="https://github.com/YOUR_USERNAME/youtube-clips-desktop/releases/latest/download/YouTube-Clips-Setup-1.0.0.exe">
  Download for Windows
</a>

<!-- Portable EXE -->
<a href="https://github.com/YOUR_USERNAME/youtube-clips-desktop/releases/latest/download/YouTube-Clips-1.0.0-win.exe">
  Download for Windows (Portable)
</a>
```

### Generic Latest Links (Always Latest Version)

```html
<!-- These ALWAYS redirect to latest version -->
<a href="https://github.com/YOUR_USERNAME/youtube-clips-desktop/releases/latest">
  Download Latest Release
</a>
```

**Note**: After your first release, check the actual filenames in GitHub Releases and update links accordingly.

---

## 🔄 How Auto-Updates Work

### For Users:
1. User opens your app
2. App checks for updates (3 seconds after launch)
3. If update available → Dialog appears: "Update available!"
4. User clicks "Download" → App downloads in background
5. Shows progress bar in dock/taskbar
6. When done → "Restart to install" dialog
7. User clicks "Restart" → App updates automatically!

### For You:
Just push a new git tag and GitHub Actions handles everything!

---

## 🛠️ Manual Build Commands

If you want to build locally:

```bash
# Build for current platform
npm run dist

# Build for macOS only
npm run dist:mac

# Build for Windows only
npm run dist:win

# Build for both
npm run dist:all
```

Built files go to `release/` folder.

---

## 📊 Version Numbering

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes (1.0.0 → 1.0.1)

---

## ✅ Checklist for First Release

- [ ] Replace `YOUR_GITHUB_USERNAME` in package.json
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Set version to 1.0.0 in package.json
- [ ] Create and push tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] Wait for GitHub Actions to complete
- [ ] Download and test the built apps
- [ ] Copy download links to your landing page
- [ ] Test auto-update by releasing v1.0.1

---

## 🍎 macOS Users - IMPORTANT

### "App is Damaged or Modified" Warning

macOS users will see a security warning because the app is **not code-signed**. This is normal for free/open-source apps.

#### Method 1: Right-Click to Open (Easiest)
1. Download and install the app
2. **Don't double-click** the app icon
3. **Right-click** (or Control+click) on "YouTube Clips" in Applications
4. Select **"Open"** from the menu
5. Click **"Open"** in the dialog that appears
6. The app will now open and remember this choice

#### Method 2: Use Terminal Command
```bash
# Download this helper script from the GitHub repo
curl -O https://raw.githubusercontent.com/arpittiwari24/youtube-clips-desktop/main/scripts/macos-open-unsigned.sh

# Make it executable
chmod +x macos-open-unsigned.sh

# Run it (removes quarantine attribute)
./macos-open-unsigned.sh
```

#### Method 3: Manual Terminal Command
```bash
# Remove quarantine from the app
xattr -cr "/Applications/YouTube Clips.app"

# Then open normally
open "/Applications/YouTube Clips.app"
```

### Why This Happens
- Code signing requires an Apple Developer account ($99/year)
- Free/open-source apps often distribute unsigned
- macOS Gatekeeper blocks unsigned apps by default
- The methods above safely bypass this for apps you trust

### For Developers: Getting Code Signing
If you want to distribute a signed app:
1. Enroll in Apple Developer Program ($99/year)
2. Get a "Developer ID Application" certificate
3. Set up notarization with Apple
4. Update package.json with signing configuration

---

## 🐛 Troubleshooting

### Build fails on macOS
- Make sure you have Xcode Command Line Tools: `xcode-select --install`

### Build fails on Windows
- Install Windows Build Tools: `npm install --global windows-build-tools`

### Auto-update not working
- Make sure you're using a **production build** (not dev mode)
- Check GitHub Releases has `latest.yml` file
- Verify package.json has correct repo owner/name

### Download links 404
- Wait for first release to complete
- Check actual filenames in GitHub Releases
- Update links to match exact filenames

---

## 📧 Need Help?

Check GitHub Actions logs for build errors:
`https://github.com/YOUR_USERNAME/youtube-clips-desktop/actions`

---

**That's it! Your app is now ready for distribution with automatic updates! 🎉**
