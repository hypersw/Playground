# Deployment Guide - Avatar Forest

## 📦 Building for Production

```bash
# Using Nix (recommended)
nix develop --command npm run build

# Or traditional
npm run build
```

This creates an optimized production build in the `dist/` folder.

## ✅ Yes, You Can Open It Directly!

After building, you have **3 deployment options**:

### Option 1: Simple Local Server (Recommended)

**ES modules require a server** due to browser CORS security. Use any simple HTTP server:

```bash
# Using the included script
./serve.sh

# Or use Python
cd dist && python3 -m http.server 8000

# Or use Nix
nix-shell -p python3 --run "cd dist && python3 -m http.server 8000"

# Or use npm
npx http-server dist -p 8000
```

Then open **http://localhost:8000**

**✓ Pros:**
- Works perfectly (no CORS issues)
- Easy to set up
- Can share on local network
- Works on all browsers

**⚠️ Notes:**
- Requires a server process running
- Still works offline (server is local)

### Option 2: Simple HTTP Server

For better browser compatibility, serve with any static server:

```bash
# Python 3
cd dist && python3 -m http.server 8000

# Node.js http-server
npx http-server dist -p 8000

# Nix + Python
nix-shell -p python3 --run "cd dist && python3 -m http.server 8000"
```

Then open http://localhost:8000

### Option 3: Deploy to Static Hosting

The `dist/` folder can be deployed to any static host:

#### GitHub Pages

```bash
# 1. Build
npm run build

# 2. Deploy to gh-pages branch
npx gh-pages -d dist
```

#### Netlify / Vercel

Drag & drop the `dist/` folder to their web interface.

Or use CLI:
```bash
# Netlify
npx netlify-cli deploy --prod --dir=dist

# Vercel
npx vercel --prod dist
```

#### itch.io (Game Platform)

1. Build: `npm run build`
2. Zip the `dist/` folder
3. Upload to itch.io as "HTML" project
4. Mark `index.html` as the entry point

## 📁 What's in dist/?

```
dist/
├── index.html                      # Entry point (OPEN THIS)
├── assets/
│   ├── index-[hash].js            # Game code (minified)
│   ├── phaser-[hash].js           # Phaser engine (minified)
│   ├── maps/                      # Tiled JSON maps
│   ├── sprites/                   # Character spritesheets
│   └── tilesets/                  # Tileset images
```

**File size:** ~1.5 MB (mostly Phaser library)

## 🌐 Sharing Your Game

### As a Zip File

```bash
# Create a distributable zip
cd dist
zip -r ../AvatarForest.zip .
cd ..

# Send AvatarForest.zip to friends!
# They just unzip and open index.html
```

### As a URL

Deploy to any of these free static hosts:
- **GitHub Pages**: Free, custom domain support
- **Netlify**: Free, automatic HTTPS, CI/CD
- **Vercel**: Free, edge network, serverless
- **itch.io**: Game-focused, community, analytics

## 🔧 Build Optimizations

The build includes:
- **Minification**: Code is compressed
- **Tree shaking**: Unused code removed
- **Asset optimization**: Images copied as-is
- **Code splitting**: Phaser in separate chunk (manual)

To further optimize:
1. **Compress images**: Use tools like `pngquant` or `imagemin`
2. **Use WebP**: Convert PNGs to WebP format (smaller)
3. **Lazy load scenes**: Use dynamic imports for scenes

## 📊 Browser Compatibility

The built game works in:
- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- ES6 modules support (all modern browsers)
- WebGL support (for Phaser rendering)
- JavaScript enabled

## 🚀 Production Checklist

Before deploying:
- [ ] Build with `npm run build`
- [ ] Test `dist/index.html` locally
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify all assets load correctly
- [ ] Test controls (WASD + Arrow keys)
- [ ] Check performance (should be 60 FPS)

## 🐛 Troubleshooting

### "Failed to load assets"

**If using file://**:
- Make sure you open `dist/index.html`, not the root `index.html`
- Assets must be in `dist/assets/` folder

**If using HTTP server**:
- Ensure server is serving from `dist/` directory
- Check browser console for 404 errors

### Black screen / blank page

1. Open browser console (F12)
2. Look for error messages
3. Common issues:
   - Assets not found (check paths)
   - WebGL not supported (update browser)
   - JavaScript disabled (enable it)

### Assets show as colored squares

This is expected! The demo uses placeholder assets. See [CC0_ASSETS_GUIDE.md](public/assets/CC0_ASSETS_GUIDE.md) to replace with real art.

## 💡 Advanced: CDN Deployment

For global performance, use a CDN:

```bash
# Build
npm run build

# Upload dist/ to CDN (e.g., AWS S3 + CloudFront)
aws s3 sync dist/ s3://your-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## 📈 Analytics (Optional)

Add analytics to `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_ID');
</script>
```

---

**Your game is ready to share with the world!** 🌲✨
