#!/bin/bash

set -e

# Detect OS
OS=$(uname -s)

case $OS in
    Linux)
        # Assume Ubuntu/Debian
        sudo apt update && sudo apt upgrade -y || { echo "Failed to update/upgrade apt"; exit 1; }
        sudo apt install -y python3 python3-apt pipx || { echo "Failed to install python3 and pipx"; exit 1; }
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

pipx install --include-deps ansible || { echo "Failed to install ansible"; exit 1; }

ansible-playbook playbook.yml || { echo "Failed to run ansible playbook"; exit 1; }
