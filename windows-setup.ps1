param (
    [switch]$InstallPackages = $true
)

$ErrorActionPreference = 'Stop'

try {
    # Elevate if not running as admin to allow symlinks (depending on Developer Mode)
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Warning "You may need to run this script as Administrator to create symlinks if Developer Mode is not enabled."
    }

    # 1. Install dependencies using Winget
    if ($InstallPackages) {
        Write-Host "Installing dependencies using winget..." -ForegroundColor Green
        
        $packages = @(
            "Rustlang.Rustup", "OpenJS.NodeJS", "Python.Python.3.10", "GoLang.Go",
            "Kitware.CMake", "zig.zig", "pnpm.pnpm", "sharkdp.fd", "junegunn.fzf",
            "BurntSushi.ripgrep.MSVC", "GnuWin32.UnZip", "JernejSimoncic.Wget",
            "ajeetdsouza.zoxide", "Tailscale.Tailscale", "Neovim.Neovim",
            "jesseduffield.lazygit", "GitHub.cli"
        )

        foreach ($pkg in $packages) {
            Write-Host "Installing $pkg..."
            winget install --id $pkg --source winget --accept-source-agreements --accept-package-agreements
            
            # Winget returns exit codes. 0 is success. 
            # -1978335189 (0x8A15002B) means already installed.
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) {
                Write-Warning "Failed to install $pkg via Winget. Exit code: $LASTEXITCODE. Continuing with other packages..."
            }
        }
    }

    # 2. Setup Neovim Configuration
    Write-Host "Setting up Neovim configuration..." -ForegroundColor Green
    $nvimDest = Join-Path $env:LOCALAPPDATA "nvim"
    # Point directly to the git repo we just cloned
    $nvimSrc = Join-Path $env:USERPROFILE ".config\nvim"

    if (Test-Path $nvimDest) {
        Write-Warning "Existing Neovim config found at $nvimDest. Renaming to nvim.bak..."
        Rename-Item -Path $nvimDest -NewName "nvim.bak" -Force
    }

    if (Test-Path $nvimSrc) {
        New-Item -ItemType Junction -Path $nvimDest -Target $nvimSrc | Out-Null
        Write-Host "Created junction for Neovim config: $nvimDest -> $nvimSrc"
    } else {
        throw "Neovim config source not found at $nvimSrc. Please ensure the repository is cloned to ~/.config."
    }

    # 3. Setup PowerShell Profile
    Write-Host "Setting up PowerShell profile..." -ForegroundColor Green
    $profileDir = Split-Path -Path $PROFILE -Parent
    if (-not (Test-Path -Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    if (-not (Test-Path -Path $PROFILE)) {
        New-Item -ItemType File -Path $PROFILE -Force | Out-Null
    }

    $profileConfig = @"

# History and prompt customizations can be handled via starship or oh-my-posh (Optional)

# Aliases equivalent to .bashrc
Set-Alias -Name ll -Value Get-ChildItem -ErrorAction SilentlyContinue
Set-Alias -Name la -Value Get-ChildItem -ErrorAction SilentlyContinue
Set-Alias -Name l -Value Get-ChildItem -ErrorAction SilentlyContinue

function lg { lazygit }
function switch { param(`$t) tmux switch-client -t `$t }

# Zoxide initialization
if (Get-Command zoxide -ErrorAction SilentlyContinue) {
    Invoke-Expression (& { (zoxide init powershell | Out-String) })
}
"@

    $currentProfile = Get-Content -Path $PROFILE -ErrorAction SilentlyContinue
    if (-not ($currentProfile -match "Zoxide initialization")) {
        Add-Content -Path $PROFILE -Value $profileConfig
        Write-Host "Added aliases and Zoxide init to PowerShell profile ($PROFILE)"
    } else {
        Write-Host "Profile seems to already have the configuration."
    }

    Write-Host "Windows setup completed successfully! Please restart your terminal." -ForegroundColor Green

} catch {
    Write-Error "Setup failed: $($_.Exception.Message)"
    exit 1
}
