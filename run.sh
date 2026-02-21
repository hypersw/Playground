#!/usr/bin/env nix-shell
#! nix-shell -i bash -p nodejs_24 imagemagick

# Avatar Forest - Complete run script
# Uses Nix to provide all dependencies automatically!

set -e

echo "🌲 Avatar Forest - Setup & Run"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo ""
fi

# Generate assets if they don't exist
if [ ! -f "public/assets/tilesets/tileset.png" ] || [ ! -f "public/assets/sprites/player.png" ]; then
    echo "🎨 Generating placeholder assets..."
    npm run generate-assets
    echo ""
fi

# Start the dev server
echo "🚀 Starting development server..."
echo "   Open http://localhost:3000 in your browser"
echo "   Press Ctrl+C to stop"
echo ""
npm run dev
