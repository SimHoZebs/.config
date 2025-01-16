{ config, pkgs, ... }:
let
  bashInit = builtins.readFile ./.bashrc;
  tmuxConfig = builtins.readFile ./tmux.conf;
  gitmuxConfig = builtins.toString ../gitmux.conf;

in
{
  # You'll need to define your username and home directory if not using NixOS
  home.username = "simho";
  home.homeDirectory = "/home/simho";

  home.stateVersion = "25.05";

  # Install packages for the user
  home.packages = with pkgs; [
    # Development tools
    rustup
    nodejs
    python311
    go
    cmake
    gcc

    # Utilities
    openssh
    curl
    wslu
    fzf
    lazygit
    ripgrep
    unzip
    wget
    gh
    zoxide
    rsync
    tailscale
    neovim
    vim

    # Version control
    git
    gitmux

    # PHP development
    php

    # Formatting tools
    nixfmt-rfc-style
  ];

  programs.bash = {
    enable = true;
    enableCompletion = true;
    shellAliases = {
    };
    initExtra = ''
      ${bashInit}
    '';
  };

  programs.tmux = {
    enable = true;
    plugins = with pkgs.tmuxPlugins; [
      sensible
      catppuccin
    ];
    extraConfig = ''
      ${tmuxConfig}
      set -g @catppuccin_flavor "mocha"
      set -g status-left '#(gitmux -cfg ${gitmuxConfig} "#{pane_current_path}")'
    '';
  };

  programs.git = {
    enable = true;
    userName = "simhozebs";
    userEmail = "simhozebs@gmail.com";
  };

  programs.zoxide = {
    enable = true;
    enableBashIntegration = true;
    options = [ "--cmd cd" ];
  };

  programs.lazygit = {
    enable = true;
    settings = {
      os = {
        editPreset = "nvim";
      };
    };
  };
}
