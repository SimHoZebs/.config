param (
    [string]$RepoUrl = "https://github.com/SimHoZebs/.config.git",
    [string]$Branch = "ansible"
)

$ErrorActionPreference = 'Stop'
$script:WslDistro = $null

function Assert-Administrator {
    $principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run this from an elevated PowerShell session. Administrator rights are required to enable OpenSSH Server and WSL."
    }
}

function Install-WingetPackage {
    param (
        [Parameter(Mandatory = $true)]
        [string]$PackageId
    )

    $existing = winget list --id $PackageId --exact --source winget 2>$null
    if ($LASTEXITCODE -eq 0 -and ($existing -match [regex]::Escape($PackageId))) {
        return
    }

    winget install --id $PackageId --exact --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "winget failed to install $PackageId with exit code $LASTEXITCODE"
    }
}

function Get-GitCommand {
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($git) {
        return $git.Source
    }

    $candidates = @(
        (Join-Path $env:ProgramFiles 'Git\cmd\git.exe'),
        (Join-Path $env:ProgramFiles 'Git\bin\git.exe')
    )

    if (${env:ProgramFiles(x86)}) {
        $candidates += Join-Path ${env:ProgramFiles(x86)} 'Git\cmd\git.exe'
    }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw 'Git was installed, but git.exe could not be found.'
}

function Invoke-Wsl {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [switch]$Root
    )

    if ($Root) {
        wsl.exe -d $script:WslDistro -u root -- bash -lc $Command
    } else {
        wsl.exe -d $script:WslDistro -- bash -lc $Command
    }

    if ($LASTEXITCODE -ne 0) {
        throw "WSL command failed with exit code $LASTEXITCODE`: $Command"
    }
}

function Ensure-Wsl {
    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
        throw "wsl.exe was not found. Install WSL from Microsoft Store or a supported Windows build, then rerun this script."
    }

    $distros = @(wsl.exe --list --quiet 2>$null | ForEach-Object { $_ -replace "`0", '' } | Where-Object { $_.Trim() })
    if ($distros.Count -eq 0) {
        Write-Host "No WSL distribution found. Installing Ubuntu..." -ForegroundColor Green
        wsl.exe --install -d Ubuntu
        throw "Ubuntu WSL installation was started. Finish the Ubuntu first-run setup, restart if prompted, then rerun this script."
    }

    $script:WslDistro = if ($distros -contains 'Ubuntu') { 'Ubuntu' } else { $distros[0].Trim() }
    wsl.exe --status | Out-Null
}

function Ensure-OpenSshServer {
    $capability = Get-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
    if ($capability.State -ne 'Installed') {
        Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0' | Out-Null
    }

    Set-Service -Name sshd -StartupType Automatic
    Start-Service -Name sshd

    if (-not (Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    }
}

function Sync-Repo {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ConfigDir
    )

    Install-WingetPackage -PackageId 'Git.Git'
    $git = Get-GitCommand

    if (Test-Path (Join-Path $ConfigDir '.git')) {
        & $git -C $ConfigDir fetch origin $Branch
        & $git -C $ConfigDir checkout $Branch
        & $git -C $ConfigDir pull --ff-only origin $Branch
        return
    }

    if (Test-Path $ConfigDir) {
        $backup = "$ConfigDir.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Move-Item -Path $ConfigDir -Destination $backup
        Write-Host "Existing .config moved to $backup" -ForegroundColor Yellow
    }

    & $git clone --branch $Branch $RepoUrl $ConfigDir
}

function Install-AnsibleInWsl {
    Invoke-Wsl -Root -Command "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-pip pipx openssh-client"
    Invoke-Wsl -Command "python3 -m pipx ensurepath >/dev/null && (python3 -m pipx install --include-deps ansible || python3 -m pipx upgrade ansible)"
}

function Install-WslSshKeyIntoWindows {
    $publicKey = wsl.exe -d $script:WslDistro -- bash -lc "mkdir -p ~/.ssh && chmod 700 ~/.ssh && if [ ! -f ~/.ssh/windows-ansible_ed25519 ]; then ssh-keygen -t ed25519 -N '' -f ~/.ssh/windows-ansible_ed25519 -C windows-ansible >/dev/null; fi && cat ~/.ssh/windows-ansible_ed25519.pub"
    if ($LASTEXITCODE -ne 0 -or -not $publicKey) {
        throw "Failed to create/read the WSL Ansible SSH key."
    }

    $sshDir = Join-Path $env:USERPROFILE '.ssh'
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null

    $authorizedKeys = Join-Path $sshDir 'authorized_keys'
    if (-not (Test-Path $authorizedKeys)) {
        New-Item -ItemType File -Path $authorizedKeys -Force | Out-Null
    }

    $currentKeys = Get-Content -Path $authorizedKeys -ErrorAction SilentlyContinue
    if ($currentKeys -notcontains $publicKey) {
        Add-Content -Path $authorizedKeys -Value $publicKey
    }

    $adminKeys = Join-Path $env:ProgramData 'ssh\administrators_authorized_keys'
    if (-not (Test-Path $adminKeys)) {
        New-Item -ItemType File -Path $adminKeys -Force | Out-Null
    }

    $currentAdminKeys = Get-Content -Path $adminKeys -ErrorAction SilentlyContinue
    if ($currentAdminKeys -notcontains $publicKey) {
        Add-Content -Path $adminKeys -Value $publicKey
    }

    icacls.exe $adminKeys /inheritance:r /grant 'Administrators:F' /grant 'SYSTEM:F' | Out-Null
}

function Write-Inventory {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ConfigDir
    )

    $windowsHost = wsl.exe -d $script:WslDistro -- bash -lc "awk '/nameserver/ { print `$2; exit }' /etc/resolv.conf"
    if ($LASTEXITCODE -ne 0 -or -not $windowsHost) {
        throw "Failed to detect the Windows host address from WSL."
    }

    $inventoryPath = Join-Path $ConfigDir '.ansible-windows-inventory.yml'
    $inventory = @"
---
windows:
  hosts:
    windows-local:
      ansible_host: $($windowsHost.Trim())
      ansible_user: $env:USERNAME
      ansible_connection: ssh
      ansible_shell_type: powershell
      ansible_ssh_private_key_file: ~/.ssh/windows-ansible_ed25519
      ansible_ssh_common_args: -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
"@

    Set-Content -Path $inventoryPath -Value $inventory -NoNewline
    return $inventoryPath
}

function Invoke-WindowsPlaybook {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ConfigDir,

        [Parameter(Mandatory = $true)]
        [string]$InventoryPath
    )

    $repoPathWsl = wsl.exe -d $script:WslDistro wslpath -a $ConfigDir
    if ($LASTEXITCODE -ne 0 -or -not $repoPathWsl) {
        throw "Failed to convert repo path to a WSL path."
    }

    $inventoryPathWsl = wsl.exe -d $script:WslDistro wslpath -a $InventoryPath
    if ($LASTEXITCODE -ne 0 -or -not $inventoryPathWsl) {
        throw "Failed to convert inventory path to a WSL path."
    }

    $repo = $repoPathWsl.Trim().Replace("'", "'\"'\"'")
    $inventory = $inventoryPathWsl.Trim().Replace("'", "'\"'\"'")
    Invoke-Wsl -Command "cd '$repo' && ~/.local/bin/ansible-galaxy collection install -r requirements.yml && ~/.local/bin/ansible-playbook -i '$inventory' windows-playbook.yml"
}

Assert-Administrator

if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw "winget.exe was not found. Install App Installer from Microsoft Store, then rerun this script."
}

$configDir = Join-Path $env:USERPROFILE '.config'

Write-Host "Preparing Windows Ansible bootstrap..." -ForegroundColor Green
Ensure-Wsl
Ensure-OpenSshServer
Sync-Repo -ConfigDir $configDir
Install-AnsibleInWsl
Install-WslSshKeyIntoWindows
$inventoryPath = Write-Inventory -ConfigDir $configDir
Invoke-WindowsPlaybook -ConfigDir $configDir -InventoryPath $inventoryPath

Write-Host "Windows setup completed successfully. Restart your terminal to pick up profile and PATH changes." -ForegroundColor Green
