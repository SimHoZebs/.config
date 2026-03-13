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

# Add a temporary NOPASSWD sudoers entry so Ansible can use become: true without prompting.
# This is removed immediately after ansible-playbook finishes via the EXIT trap.
SUDOERS_TEMP="/etc/sudoers.d/ansible-bootstrap-$(id -un)"
echo "$(id -un) ALL=(ALL) NOPASSWD: ALL" | sudo tee "$SUDOERS_TEMP" > /dev/null
sudo chmod 0440 "$SUDOERS_TEMP"

cleanup_sudoers() {
    if ! sudo rm -f "$SUDOERS_TEMP" 2>/dev/null; then
        echo "WARNING: Failed to remove temporary sudoers file: $SUDOERS_TEMP" >&2
        echo "WARNING: Please remove it manually: sudo rm -f $SUDOERS_TEMP" >&2
    fi
}
trap cleanup_sudoers EXIT

ansible-playbook playbook.yml || { echo "Failed to run ansible playbook"; exit 1; }
