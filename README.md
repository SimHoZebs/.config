Dotfiles and development environment configuration managed with Ansible. Supports Debian, Ubuntu, Fedora, and macOS.

## Quick Install

Run this single command to install:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/SimHoZebs/.config/ansible/install.sh)
```

Or with wget:

```bash
bash <(wget -qO- https://raw.githubusercontent.com/SimHoZebs/.config/ansible/install.sh)
```

The install script will:
- Backup your existing `~/.config` directory (if it exists)
- Clone this repository to `~/.config`
- Run the bootstrap script to set up your environment

## Manual Setup

If you prefer to install manually:

1. Clone this repo to `~/.config`
2. Run `./bootstrap.sh`

The bootstrap script will install Python, pipx, and Ansible, then run the playbook to configure your environment.

## Manual setups still required
- [Docker](https://docs.docker.com/engine/install/)
