#!/usr/bin/env nix-shell
#! nix-shell -i bash -p python3

# Simple HTTP server for the built game
# Uses Nix to provide Python3 automatically - no system dependencies needed!

set -e

echo "🌲 Avatar Forest - Local Server"
echo ""

if [ ! -d "dist" ]; then
    echo "❌ dist/ folder not found."
    echo ""
    echo "Build the game first:"
    echo "  nix build            (creates ./result/)"
    echo "  npm run build        (creates ./dist/)"
    echo ""
    echo "Or use: nix run        (builds and serves automatically)"
    exit 1
fi

PORT="${1:-8000}"

echo "📡 Starting server on http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
echo ""

cd dist && python3 -m http.server "$PORT"
