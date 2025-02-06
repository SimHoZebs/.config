While the flake is kind of written to support building a custom NixOS iso, I am only running home-manager on either Debian or Ubuntu.

1. Install Nix package manager `sh <(curl -L https://nixos.org/nix/install) --daemon`
2. Clone this repo `nix shell nixpkgs#git -c git clone https://github.com/simhozebs/.config.git`
3. In .config, `nix run .#homeConfigurations.simho.activationPackage`

## Manual set ups still required:
- [Tailscale](https://tailscale.com/kb/1031/install-linux)
- [Docker](https://docs.docker.com/engine/install/)
