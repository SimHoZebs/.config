{ config, pkgs, ... }:
let
  bashInit = builtins.readFile ./bash_init.sh;

in
{
  # You'll need to define your username and home directory if not using NixOS
  home.username = "ho";
  home.homeDirectory = "/home/ho";

  home.stateVersion = "25.05";

  # Install packages for the user
  home.packages = with pkgs; [
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
    '';
  };

  programs.tmux = {
    enable = true;
    # Import the same configuration from flake.nix, or refine it here.
    extraConfig = ''
      # remap prefix from 'C-b' to 'C-a'
      unbind C-b
      set-option -g prefix C-a
      bind-key C-a send-prefix
      # increase the scroll hitory
      set-option -g history-limit 100000
      set-option -sg escape-time 10
      set-option -g focus-events on
      # split panes using | and -
      bind v split-window -h -c "#{pane_current_path}"
      bind c new-window -c "#{pane_current_path}"

      set-option -g status-position top
      set-option -g repeat-time 350

      # Set window notifications
      setw -g monitor-activity on
      set -g visual-activity on

      # Automatically set window title
      setw -g automatic-rename

      # vim-style nav
      setw -g mode-keys vi

      # use vim-style hjkl navigation for pane switching
      bind h select-pane -L
      bind j select-pane -D
      bind k select-pane -U
      bind l select-pane -R

      # List of plugins
      set -g @plugin 'tmux-plugins/tpm'
      set -g @plugin 'tmux-plugins/tmux-sensible'

      set -g @plugin 'erikw/tmux-powerline'

      # Initialize TMUX plugin manager (keep this line at the very bottom of tmux.conf)
      run '~/.tmux/plugins/tpm/tpm' # Keep this for plugin management
    '';
  };

  programs.git = {
    enable = true;
    userName = "simhozebs";
    userEmail = "simhozebs@gmail.com";
  };
  programs.zoxide = {
    enableBashIntegration = true;
    options = [ "--cmd cd" ];
  };
}
