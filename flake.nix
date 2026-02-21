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

        # Build the game as a package using buildNpmPackage
        avatar-forest = pkgs.buildNpmPackage {
          pname = "avatar-forest";
          version = "0.1.0";

          src = ./.;

          # Hash of npm dependencies - Nix will fetch and cache them
          # To update: set to lib.fakeHash, build will fail with correct hash
          npmDepsHash = "sha256-LtAMjWFvIrHM7J74IaO8UuWEtuT2QBDPdddpXafgFas=";

          nativeBuildInputs = with pkgs; [
            imagemagick
          ];

          preBuild = ''
            # Generate placeholder assets before building
            if [ ! -f "public/assets/tilesets/tileset.png" ]; then
              echo "🎨 Generating placeholder assets..."
              bash scripts/generate-placeholder-assets.sh
            fi
          '';

          buildPhase = ''
            echo "🏗️  Building Avatar Forest..."
            npm run build
          '';

          installPhase = ''
            mkdir -p $out
            cp -r dist/* $out/

            # Create a simple launcher script
            mkdir -p $out/bin
            cat > $out/bin/avatar-forest-serve << 'EOF'
            #!/usr/bin/env bash
            PORT=''${1:-8000}
            echo "🌲 Avatar Forest - Serving on http://localhost:$PORT"
            echo "Press Ctrl+C to stop"
            cd "$out" && ${pkgs.python3}/bin/python3 -m http.server "$PORT"
            EOF
            chmod +x $out/bin/avatar-forest-serve
          '';

          meta = with pkgs.lib; {
            description = "A 2D browser-based avatar worlds game";
            license = licenses.mit;
          };
        };

      in
      {
        # Package output - for building
        packages.default = avatar-forest;

        # App outputs - for running
        apps = {
          # Serve the built game
          default = {
            type = "app";
            program = "${avatar-forest}/bin/avatar-forest-serve";
          };

          # Alternative: serve with custom port
          serve = {
            type = "app";
            program = "${pkgs.writeShellScript "avatar-forest-serve" ''
              PORT=''${1:-8000}
              echo "🌲 Avatar Forest - Serving on http://localhost:$PORT"
              echo "Press Ctrl+C to stop"
              cd "${avatar-forest}" && ${pkgs.python3}/bin/python3 -m http.server "$PORT"
            ''}";
          };

          # Development server (requires being in the project directory)
          dev = {
            type = "app";
            program = "${pkgs.writeShellScript "avatar-forest-dev" ''
              set -e

              if [ ! -f "package.json" ]; then
                echo "Error: Must be run from the project directory"
                exit 1
              fi

              if [ ! -d "node_modules" ]; then
                echo "📦 Installing dependencies..."
                ${pkgs.nodejs_24}/bin/npm install
              fi

              if [ ! -f "public/assets/tilesets/tileset.png" ]; then
                echo "🎨 Generating assets..."
                export PATH="${pkgs.imagemagick}/bin:$PATH"
                ${pkgs.nodejs_24}/bin/npm run generate-assets
              fi

              echo "🚀 Starting development server..."
              ${pkgs.nodejs_24}/bin/npm run dev
            ''}";
          };
        };

        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            git
            imagemagick
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
            echo "Flake commands:"
            echo "  nix build            - Build distribution package"
            echo "  nix run              - Build and serve the game"
            echo "  nix run .#dev        - Run development server"
            echo ""

            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
        };
      }
    );
}
