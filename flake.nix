{
  description = "Avatar Forest - Phaser 3 + TypeScript + Vite game";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js and npm
            nodejs_24

            # Version control
            git

            # Asset generation tools
            imagemagick

            # Optional but useful
            nodePackages.typescript
            nodePackages.typescript-language-server
          ];

          shellHook = ''
            echo "🌲 Avatar Forest Development Environment"
            echo ""
            echo "Node.js version: $(node --version)"
            echo "npm version: $(npm --version)"
            echo ""
            echo "Available commands:"
            echo "  npm install          - Install dependencies"
            echo "  npm run generate-assets - Create placeholder assets"
            echo "  npm run dev          - Start dev server"
            echo "  npm run build        - Build for production"
            echo ""

            # Set up npm to use local node_modules
            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
        };
      }
    );
}
