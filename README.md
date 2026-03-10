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
- Install Git (if not already installed)
- Backup your existing `~/.config` directory (if it exists and is not this repository)
- Clone this repository to `~/.config` (or update it if already cloned)
- Install Python, pipx, and Ansible
- Run the Ansible playbook to set up your environment

## Manual Setup

If you prefer to install manually:

1. Clone this repo to `~/.config`
2. Run `./install.sh`

The install script will install Git (if needed), Python, pipx, and Ansible, then run the playbook to configure your environment.

## Manual setups still required
- [Docker](https://docs.docker.com/engine/install/)
