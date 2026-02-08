#!/bin/bash

set -e

REPO_URL="https://github.com/SimHoZebs/.config.git"
CONFIG_DIR="$HOME/.config"
BACKUP_DIR="$HOME/.config.backup.$(date +%Y%m%d_%H%M%S)"

echo "============================================"
echo "SimHoZebs/.config Installation Script"
echo "============================================"
echo ""

# Check if .config directory exists
if [ -d "$CONFIG_DIR" ]; then
    echo "⚠️  Existing .config directory found at $CONFIG_DIR"
    
    # Check if it's already our repo
    if [ -d "$CONFIG_DIR/.git" ]; then
        cd "$CONFIG_DIR"
        CURRENT_REMOTE=$(git config --get remote.origin.url 2>/dev/null || echo "")
        
        if [[ "$CURRENT_REMOTE" == *"SimHoZebs/.config"* ]]; then
            echo "✓ This appears to be the SimHoZebs/.config repository already."
            echo "  Updating instead of cloning..."
            git pull origin master || { echo "Failed to update repository"; exit 1; }
            echo "✓ Repository updated successfully!"
            echo ""
            echo "Running bootstrap script..."
            ./bootstrap.sh
            exit 0
        fi
    fi
    
    # Backup existing .config
    echo "  Creating backup at: $BACKUP_DIR"
    mv "$CONFIG_DIR" "$BACKUP_DIR" || { echo "Failed to backup .config directory"; exit 1; }
    echo "✓ Backup created successfully"
fi

# Clone the repository
echo ""
echo "Cloning repository to $CONFIG_DIR..."
git clone "$REPO_URL" "$CONFIG_DIR" || { 
    echo "Failed to clone repository"
    # Restore backup if clone fails
    if [ -d "$BACKUP_DIR" ]; then
        echo "Restoring backup..."
        mv "$BACKUP_DIR" "$CONFIG_DIR"
    fi
    exit 1
}

echo "✓ Repository cloned successfully!"
echo ""

# Run bootstrap script
echo "Running bootstrap script..."
cd "$CONFIG_DIR"
./bootstrap.sh

echo ""
echo "============================================"
echo "✓ Installation completed successfully!"
echo "============================================"
echo ""
if [ -d "$BACKUP_DIR" ]; then
    echo "Your previous .config was backed up to:"
    echo "  $BACKUP_DIR"
    echo ""
    echo "You can delete it once you've verified everything works:"
    echo "  rm -rf $BACKUP_DIR"
fi
echo ""
echo "Please restart your shell or run: source ~/.bashrc"
