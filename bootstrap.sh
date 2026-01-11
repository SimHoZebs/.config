#!/bin/bash

set -e

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
                sudo apt update && sudo apt upgrade -y || { echo "Failed to update/upgrade apt"; exit 1; }
                sudo apt install -y python3 python3-apt pipx || { echo "Failed to install python3 and pipx"; exit 1; }
                ;;
            fedora)
                sudo dnf update -y || { echo "Failed to update/upgrade dnf"; exit 1; }
                sudo dnf install -y python3 python3-pip pipx || { echo "Failed to install python3 and pipx"; exit 1; }
                ;;
            *)
                echo "Unsupported Linux distribution: $DISTRO"
                exit 1
                ;;
        esac
        ;;
    Darwin)
        # macOS
        brew update || { echo "Failed to update brew"; exit 1; }
        brew install python3 pipx || { echo "Failed to install python3 and pipx"; exit 1; }
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

source ~/.config/.bashrc

pipx ensurepath --force

pipx install --include-deps ansible || { echo "Failed to install ansible"; exit 1; }

ansible-playbook playbook.yml || { echo "Failed to run ansible playbook"; exit 1; }
