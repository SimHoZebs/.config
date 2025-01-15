While the flake has an option to build a custom NixOS iso, I am running the set up on a debian machine so I learn how to work with Nix systems without being stuck in it.


1. Install Nix package manager `sh <(curl -L https://nixos.org/nix/install) --daemon`
2. Clone this repo `nix shell nixpkgs#git -c git clone https://github.com/simhozebs/.config.git`
3. In .config, `nix run .#homeConfigurations.simho.activationPackage`

## Manual set ups still required:
- Tailscale
