{
  description = "Custom NixOS ISO";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      home-manager,
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {

      nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {
        inherit system;
        modules = [
          # Base installation media configuration
          "${nixpkgs}/nixos/modules/installer/cd-dvd/installation-cd-minimal.nix"

          # System configuration
          (
            { config, pkgs, ... }:
            {
              virtualisation.docker.enable = true;
              # Hardware and boot configuration
              hardware.enableAllFirmware = true;
              boot = {
                kernelModules = [ "e1000e" ];
              };

              # Networking configuration
              networking = {
                networkmanager.enable = true;
              };

              # NVIDIA configuration (choose one if applicable):
              # services.xserver.videoDrivers = [ "nouveau" ]; # Open-source
              services.xserver.videoDrivers = [ "nvidia" ]; # Proprietary
              # hardware.nvidia.package = config.pkgs.linuxPackages.nvidiaPackages.stable;

              # System packages
              environment.systemPackages = with pkgs; [
                vim
                nixfmt-rfc-style
                openssh
              ];

              services.openssh.enable = true;

              nixpkgs.config.allowUnfree = true;

              # Enable home-manager
              home-manager = {
                useGlobalPkgs = true;
                useUserPackages = true;
              };

              # User configuration
              users = {
                mutableUsers = false;
                users = {
                  nixos = {
                    isNormalUser = true;
                    openssh.authorizedKeys.keys = [
                      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBRGhD1hvAfgEHsSr5INZTOah/zCXvi7aZs+3qc/bBhJ"
                    ];
                    extraGroups = [
                      "wheel"
                      "docker"
                    ];
                    initialPassword = "nixos";
                  };
                  root.initialPassword = "password";
                };
              };

              # System state version
              system.stateVersion = "24.05";
            }
          )
        ];
      };

      homeConfigurations.simho = home-manager.lib.homeManagerConfiguration {
        pkgs = pkgs;
        modules = [
          ./home.nix
        ];
      };
    };
}
