#!/bin/bash

# clarvis installer script

set -e

echo "🚀 Installing clarvis..."

# Check for required tools
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

if ! command -v lspeak &> /dev/null; then
    echo "⚠️  lspeak not found. Please install it:"
    echo "   uv tool install git+https://github.com/nickpending/lspeak.git"
    echo "   or: pip install git+https://github.com/nickpending/lspeak.git"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the project
echo "🔨 Building clarvis..."
bun run build

# Make executable
chmod +x dist/index.js

# Create symlink (XDG Base Directory compliant)
INSTALL_DIR="$HOME/.local/bin"
if [ ! -d "$INSTALL_DIR" ]; then
    echo "📁 Creating ~/.local/bin directory..."
    mkdir -p "$INSTALL_DIR"
fi

echo "🔗 Creating symlink in $INSTALL_DIR..."
ln -sf "$(pwd)/dist/index.js" "$INSTALL_DIR/clarvis"

# Check if ~/.local/bin is in PATH
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
    echo "⚠️  Note: ~/.local/bin is not in your PATH"
    echo "   Add this to your shell config (.bashrc, .zshrc, etc.):"
    echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

# Create config directory
CONFIG_DIR="$HOME/.config/clarvis"
if [ ! -d "$CONFIG_DIR" ]; then
    echo "📁 Creating config directory..."
    mkdir -p "$CONFIG_DIR"
fi

# Copy example config if no config exists
if [ ! -f "$CONFIG_DIR/config.toml" ]; then
    echo "📝 Creating example config..."
    cp config.toml.example "$CONFIG_DIR/config.toml"
    echo "   Please edit $CONFIG_DIR/config.toml with your API keys"
fi

echo ""
echo "✅ clarvis installed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit ~/.config/clarvis/config.toml with your API keys"
echo "2. Configure Claude Code hooks in ~/.claude/settings.json:"
echo '   {
     "hooks": {
       "Stop": [{
         "matcher": "",
         "hooks": [{
           "type": "command",
           "command": "cat | clarvis"
         }]
       }]
     }
   }'
echo "3. Test with: echo 'test' | clarvis"