#!/bin/bash

set -e

REPO_URL="https://github.com/SimHoZebs/.config.git"
CONFIG_DIR="$HOME/.config"
BACKUP_DIR="$HOME/.config.backup.$(date +%Y%m%d_%H%M%S)"

echo "============================================"
echo "SimHoZebs/.config Installation Script"
echo "============================================"
echo ""

# Check if git is installed
if ! command -v git >/dev/null 2>&1; then
    echo "Git is not installed. Installing git..."
    
    # Detect OS and distribution
    OS=$(uname -s)
    DISTRO=""
    
    if [ "$OS" = "Linux" ]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO=$ID
        elif command -v lsb_release >/dev/null 2>&1; then
            DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        fi
    fi
    
    case $OS in
        Linux)
            case $DISTRO in
                ubuntu|debian)
                    sudo apt update || { echo "Failed to update apt"; exit 1; }
                    sudo apt install -y git || { echo "Failed to install git"; exit 1; }
                    ;;
                fedora)
                    sudo dnf install -y git || { echo "Failed to install git"; exit 1; }
                    ;;
                *)
                    echo "Unsupported Linux distribution: $DISTRO"
                    echo "Please install git manually and run this script again."
                    exit 1
                    ;;
            esac
            ;;
        Darwin)
            # macOS - check if Homebrew is available
            if command -v brew >/dev/null 2>&1; then
                brew install git || { echo "Failed to install git"; exit 1; }
            else
                echo "Homebrew is not installed. Please install git manually:"
                echo "  1. Install Homebrew from https://brew.sh"
                echo "     /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                echo "  2. Run: brew install git"
                echo "  3. Run this script again"
                exit 1
            fi
            ;;
        *)
            echo "Unsupported OS: $OS"
            echo "Please install git manually and run this script again."
            exit 1
            ;;
    esac
    
    echo "✓ Git installed successfully!"
    echo ""
else
    echo "✓ Git is already installed"
    echo ""
fi

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
            git pull origin ansible || { 
                echo "Failed to update repository. Please check your network connection or resolve any merge conflicts manually."; 
                exit 1; 
            }
            echo "✓ Repository updated successfully!"
            echo ""
            # Continue to bootstrap section
            SKIP_CLONE=true
        else
            # Not our repo, need to backup and clone
            echo "  Creating backup at: $BACKUP_DIR"
            mv "$CONFIG_DIR" "$BACKUP_DIR" || { echo "Failed to backup .config directory"; exit 1; }
            echo "✓ Backup created successfully"
        fi
    else
        # Not a git repo, backup existing .config
        echo "  Creating backup at: $BACKUP_DIR"
        mv "$CONFIG_DIR" "$BACKUP_DIR" || { echo "Failed to backup .config directory"; exit 1; }
        echo "✓ Backup created successfully"
    fi
fi

# Clone the repository if needed
if [ -z "$SKIP_CLONE" ]; then
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
    cd "$CONFIG_DIR" || { echo "Failed to change to $CONFIG_DIR"; exit 1; }
fi

# Bootstrap: Install dependencies and run playbook
echo "============================================"
echo "Setting up dependencies..."
echo "============================================"
echo ""

# Detect OS and distribution for bootstrap
BOOTSTRAP_OS=$(uname -s)
BOOTSTRAP_DISTRO=""

if [ "$BOOTSTRAP_OS" = "Linux" ]; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        BOOTSTRAP_DISTRO=$ID
    elif command -v lsb_release >/dev/null 2>&1; then
        BOOTSTRAP_DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
    fi
fi

# Install Python3, pipx based on OS
case $BOOTSTRAP_OS in
    Linux)
        case $BOOTSTRAP_DISTRO in
            ubuntu|debian)
                echo "Installing Python3 and pipx on Debian/Ubuntu..."
                sudo apt update && sudo apt upgrade -y || { echo "Failed to update/upgrade apt"; exit 1; }
                sudo apt install -y python3 python3-apt pipx || { echo "Failed to install python3 and pipx"; exit 1; }
                ;;
            fedora)
                echo "Installing Python3 and pipx on Fedora..."
                sudo dnf update -y || { echo "Failed to update/upgrade dnf"; exit 1; }
                sudo dnf install -y python3 python3-pip pipx || { echo "Failed to install python3 and pipx"; exit 1; }
                ;;
            *)
                echo "Unsupported Linux distribution: $BOOTSTRAP_DISTRO"
                exit 1
                ;;
        esac
        ;;
    Darwin)
        # macOS
        echo "Installing Python3 and pipx on macOS..."
        brew update || { echo "Failed to update brew"; exit 1; }
        brew install python3 pipx || { echo "Failed to install python3 and pipx"; exit 1; }
        ;;
    *)
        echo "Unsupported OS: $BOOTSTRAP_OS"
        exit 1
        ;;
esac

echo "✓ Dependencies installed successfully!"
echo ""

# Source bashrc if it exists
if [ -f "$CONFIG_DIR/.bashrc" ]; then
    source "$CONFIG_DIR/.bashrc"
fi

# Ensure pipx path
echo "Ensuring pipx is in PATH..."
pipx ensurepath --force

echo "✓ pipx path configured!"
echo ""

# Install Ansible
echo "Installing Ansible..."
pipx install --include-deps ansible || { echo "Failed to install ansible"; exit 1; }

echo "✓ Ansible installed successfully!"
echo ""

# Add pipx bin directory to PATH for current shell
export PATH="$HOME/.local/bin:$PATH"

# Run Ansible playbook
echo "============================================"
echo "Running Ansible playbook..."
echo "============================================"
echo ""

ansible-playbook "$CONFIG_DIR/playbook.yml" || { echo "Failed to run ansible playbook"; exit 1; }

echo "✓ Ansible playbook completed successfully!"
echo ""

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
echo "Please restart your shell or source your shell configuration file."
