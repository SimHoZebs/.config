#!/bin/bash

set -e

sudo apt update && sudo apt upgrade -y

source ~/.config/.bashrc

sudo apt install -y python3 python3-apt pipx
pipx install --include-deps ansible

