#!/bin/bash

set -e

sudo apt update && sudo apt upgrade -y

# Ensure ~/.local/bin is in PATH
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
fi

sudo apt install -y python3 python3-apt pipx
pipx install --include-deps ansible

