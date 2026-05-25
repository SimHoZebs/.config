Dotfiles and development environment configuration managed with Ansible. Supports Debian, Ubuntu, Fedora, macOS, and Windows.

## Quick Install

### Linux and macOS

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

### Windows

Run this from an elevated PowerShell session:

```powershell
irm https://raw.githubusercontent.com/SimHoZebs/.config/ansible/windows-setup.ps1 | iex
```

The Windows bootstrap script will:
- Clone or update this repository at `%USERPROFILE%\.config`
- Ensure WSL and OpenSSH Server are available
- Install Ansible inside WSL
- Configure SSH access from WSL back to native Windows
- Run `windows-playbook.yml` against Windows with Ansible

If WSL has not been initialized yet, the script will start Ubuntu installation and ask you to finish the first-run Ubuntu setup before rerunning the same command.

## Manual Setup

If you prefer to install manually:

1. Clone this repo to `~/.config`
2. Run `./bootstrap.sh`

The bootstrap script will install Python, pipx, and Ansible, then run the playbook to configure your environment.

For Windows manual setup, clone this repository to `%USERPROFILE%\.config`, make sure WSL and OpenSSH Server are enabled, then run `windows-setup.ps1` from an elevated PowerShell session.

## Manual setups still required
- [Docker](https://docs.docker.com/engine/install/)
