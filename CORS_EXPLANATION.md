# Why file:// Doesn't Work (And How to Fix It)

## 🚫 The Problem

You saw this error:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading
the remote resource at file:///path/to/assets/index.js.
(Reason: CORS request not http).
```

## 🔍 Why This Happens

Modern web browsers **block ES modules** (JavaScript with `type="module"`) from loading via `file://` protocol for security reasons:

1. **CORS Policy**: Browsers enforce Cross-Origin Resource Sharing (CORS) rules
2. **ES Modules**: Your game uses modern JavaScript modules (`import/export`)
3. **Security**: `file://` doesn't have the same security context as `http://`

This affects:
- ❌ Vite builds (uses ES modules)
- ❌ Modern JavaScript frameworks (React, Vue, etc.)
- ❌ Any project using `import` statements

## ✅ The Solution: Use a Local Server

You need to serve the game via HTTP (even locally). Here are your options:

### Option 1: Use the Included Script (Easiest)

```bash
./serve.sh
```

This automatically detects and uses an available HTTP server.

### Option 2: Python (Usually Pre-installed)

```bash
# Python 3
cd dist && python3 -m http.server 8000

# Python 2 (older systems)
cd dist && python -m SimpleHTTPServer 8000
```

Then open: **http://localhost:8000**

### Option 3: Node.js http-server

```bash
npx http-server dist -p 8000
```

### Option 4: Vite Preview (Recommended for Development)

```bash
npm run preview
```

Opens at: **http://localhost:4173**

### Option 5: PHP (if installed)

```bash
cd dist && php -S localhost:8000
```

### Option 6: Using Nix

```bash
# One command - no installation needed
nix-shell -p python3 --run "cd dist && python3 -m http.server 8000"
```

## 📦 Deploying to Production

For production, deploy to ANY static hosting service - they all provide HTTP servers:

- **GitHub Pages** - Free, automatic HTTPS
- **Netlify** - Free tier, custom domains
- **Vercel** - Free tier, edge network
- **itch.io** - Game-focused platform
- **Surge.sh** - Dead simple CLI deployment

Example:
```bash
# Build
npm run build

# Deploy to surge
npx surge dist
```

## 🤔 Alternative: Build Without Modules (Not Recommended)

You *could* build without ES modules using older formats, but:

- ❌ Larger file sizes
- ❌ Slower load times
- ❌ No modern optimizations
- ❌ Harder to debug

**Just use a local server - it's easier!**

## 💡 Why This Is Actually Good

The `file://` restriction is a **security feature**:

- Prevents malicious scripts from accessing your local filesystem
- Protects you from XSS attacks in local HTML files
- Ensures consistent behavior between dev and production

Modern web development **expects an HTTP context**, and that's a good thing!

## 🎯 Quick Reference

| Scenario | Solution |
|----------|----------|
| **Testing locally** | `./serve.sh` or `python3 -m http.server` |
| **Development** | `npm run dev` (hot reload) |
| **Preview build** | `npm run preview` |
| **Production** | Deploy to Netlify/Vercel/GitHub Pages |
| **Sharing with friends** | Deploy to itch.io or send URL |

## 🚀 TL;DR

**You can't use `file://` with modern JavaScript builds.**

**Quick fix:**
```bash
cd dist
python3 -m http.server 8000
# Open http://localhost:8000
```

That's it! The game works perfectly once served via HTTP.
