{ config, pkgs, ... }:
let
  bashInit = builtins.readFile ./.bashrc;
  tmuxConfig = builtins.readFile ./tmux.conf;

in
{
  # You'll need to define your username and home directory if not using NixOS
  home.username = "ho";
  home.homeDirectory = "/home/ho";

  home.stateVersion = "25.05";

  # Install packages for the user
  home.packages = with pkgs; [
    openssh
    curl
    wslu
    neovim
    fzf
    lazygit
    ripgrep
    unzip
    wget
    gh
    zoxide
    git
    rustup
    nodejs
    python311
    go
    cmake
    gcc
    nixfmt-rfc-style
  ];

  programs.bash = {
    enable = true;
    enableCompletion = true; # Enables programmable completion
    shellAliases = {
    };
    initExtra = ''
      ${bashInit}
      if [ -z "$TMUX" ]; then exec tmux; fi
    '';
  };

  programs.tmux = {
    enable = true;
    plugins = with pkgs; [
      tmuxPlugins.tmux-powerline
    ];
    extraConfig = ''
      ${tmuxConfig}
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
}