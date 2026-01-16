# Environment Variables Setup Guide

This app uses environment variables to configure API endpoints. This keeps sensitive URLs out of the public repository.

---

## 📁 Local Development

### 1. Create your .env file

The `.env` file is already created but in `.gitignore` (never committed to git).

**File: `.env`**
```env
# Auth API (for login, signup, user profile)
VITE_AUTH_API_URL=http://localhost:3001

# Caption API (for subtitle generation)
VITE_CAPTION_API_URL=https://api-x.subscut.com
```

### 2. Update with your actual API URLs

Edit `.env` and replace with your production API URLs:
```env
VITE_AUTH_API_URL=https://your-auth-api.com
VITE_CAPTION_API_URL=https://your-caption-api.com
```

### 3. Keep .env file safe

- ✅ `.env` is in `.gitignore` - it will NEVER be committed
- ✅ `.env.example` is committed as a template for others
- ⚠️ NEVER commit `.env` to git
- ⚠️ NEVER share your `.env` file publicly

---

## 🔧 How .env Works

### When in .gitignore:
- Git ignores the file completely
- It won't show up in `git status`
- It won't be included in commits
- It stays on your local machine only

### Keeping it available:
The `.env` file stays on your computer because:
- **Local development**: You create it once and it stays there
- **Team members**: They copy `.env.example` to `.env` and add their own URLs
- **CI/CD builds**: GitHub Actions uses GitHub Secrets (see below)

---

## 🚀 GitHub Actions (CI/CD Builds)

For automated builds, you need to add the API URLs as **GitHub Secrets**.

### Step 1: Go to Repository Settings

1. Open: `https://github.com/arpittiwari24/youtube-clips-desktop`
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions** (left sidebar)

### Step 2: Add Repository Secrets

Click **New repository secret** and add these two secrets:

**Secret 1:**
- Name: `VITE_AUTH_API_URL`
- Value: `https://your-auth-api.com` (your actual auth API URL)

**Secret 2:**
- Name: `VITE_CAPTION_API_URL`
- Value: `https://your-caption-api.com` (your actual caption API URL)

### Step 3: How it works

When you push a tag (e.g., `v1.0.0`):
1. GitHub Actions reads the secrets
2. Passes them as environment variables to the build
3. Vite includes them in the compiled app
4. Built app has the correct API URLs

---

## 📋 Quick Reference

| File | Purpose | In Git? |
|------|---------|---------|
| `.env` | Your actual API URLs (secret) | ❌ No (.gitignore) |
| `.env.example` | Template for team members | ✅ Yes (committed) |
| GitHub Secrets | API URLs for CI/CD builds | N/A (GitHub only) |

---

## ✅ Checklist

**Local Development:**
- [x] `.env` file exists
- [ ] Updated `.env` with your actual API URLs
- [ ] Verified `.env` is in `.gitignore`

**GitHub Repository:**
- [ ] Repository is public (for downloads)
- [ ] Added `VITE_AUTH_API_URL` secret
- [ ] Added `VITE_CAPTION_API_URL` secret

---

## 🔒 Security Best Practices

1. **Never commit secrets**: Always use `.env` for local, GitHub Secrets for CI/CD
2. **Use HTTPS**: Production APIs should use HTTPS, not HTTP
3. **Rotate secrets**: If accidentally exposed, change API URLs and update secrets
4. **Team sharing**: Share `.env.example`, not `.env`

---

## 🐛 Troubleshooting

### "API not found" errors in built app
- Check GitHub Secrets are set correctly
- Rebuild by deleting and recreating the version tag

### .env changes not reflected
- Restart dev server: Stop and run `npm run dev` again
- Clear cache: `rm -rf dist/` and rebuild

### Team member can't run app
- They need to copy `.env.example` to `.env`
- Update `.env` with actual API URLs

---

That's it! Your API URLs are now secure and won't be exposed in the public repository.
