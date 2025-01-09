# History settings
HISTCONTROL=ignoreboth
shopt -s histappend
HISTSIZE=1000
HISTFILESIZE=2000
shopt -s checkwinsize

# Prompt (Simplified - Direct Color)
PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

case "$TERM" in
  xterm*|rxvt*)
    PS1="\[\e]0;${debian_chroot:+($debian_chroot)}\u@\h: \w\a\]$PS1"
    ;;
esac

export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
[ -f ~/.fzf.bash ] && source ~/.fzf.bash
eval "$(zoxide init bash --cmd cd)"
if [ -f '/home/${USER}/google-cloud-sdk/path.bash.inc' ]; then . '/home/${USER}/google-cloud-sdk/path.bash.inc'; fi
if [ -f '/home/${USER}/google-cloud-sdk/completion.bash.inc' ]; then . '/home/${USER}/google-cloud-sdk/completion.bash.inc'; fi
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export XDG_RUNTIME_DIR="/tmp/XDG_RUNTIME_DIR/"
mkdir -p /tmp/XDG_RUNTIME_DIR/
chmod 777 /tmp/XDG_RUNTIME_DIR/

alias ll="ls -alF"
alias la="ls -A"
alias l="ls -CF"
alias alert="notify-send --urgency=low -i \"$([ $? = 0 ] && echo terminal || echo error)\" \"$(history|tail -n1|sed -e 's/^\s*[0-9]\\+\\s*//;s/[;&|]\\s*alert$//')\""
alias grep="grep --color=auto"
alias fgrep="fgrep --color=auto"
alias egrep="egrep --color=auto"
alias lg="lazygit"
