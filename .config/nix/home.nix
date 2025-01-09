{ config, pkgs, ... }:

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
  ];

  programs.bash = {
    enable = true;
    enableCompletion = true; # Enables programmable completion
    shellAliases = {
      ll = "ls -alF";
      la = "ls -A";
      l = "ls -CF";
      alert = "notify-send --urgency=low -i \"$([ $? = 0 ] && echo terminal || echo error)\" \"$(history|tail -n1|sed -e 's/^\s*[0-9]\\+\\s*//;s/[;&|]\\s*alert$//')\"";
      grep = "grep --color=auto";
      fgrep = "fgrep --color=auto";
      egrep = "egrep --color=auto";
      lg = "lazygit";
    };
    initExtra = ''
      # History settings
      HISTCONTROL=ignoreboth
      shopt -s histappend
      HISTSIZE=1000
      HISTFILESIZE=2000
      shopt -s checkwinsize

      # Prompt
      case "$TERM" in
        xterm-color|*-256color) color_prompt=yes;;
      esac

      # dircolors
      eval "$(dircolors -b)" # Use system dircolors

      # Other environment variables and settings from your .bashrc
      export PNPM_HOME="$HOME/.local/share/pnpm"
      export PATH="$PNPM_HOME:$PATH"
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
      [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
      [ -f ~/.fzf.bash ] && source ~/.fzf.bash
      eval "$(zoxide init bash --cmd cd)"
      eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
      export BUN_INSTALL="$HOME/.bun"
      export PATH="$BUN_INSTALL/bin:$PATH"
      export XDG_RUNTIME_DIR="/tmp/XDG_RUNTIME_DIR/"
      mkdir -p /tmp/XDG_RUNTIME_DIR/
      chmod 777 /tmp/XDG_RUNTIME_DIR/
      . "$HOME/.cargo/env"
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
enable=true;
userName="simhozebs";
            userEmail="simhozebs@gmail.com";
};
}

