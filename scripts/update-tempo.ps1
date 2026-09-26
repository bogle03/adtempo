$ErrorActionPreference = 'Stop'
try {
    if (Get-Process -Name Tempo -ErrorAction SilentlyContinue) {
        throw 'Exit Tempo from its system tray menu, then run UPDATE.cmd again.'
    }
    $installer = Join-Path $PSScriptRoot 'Tempo-Setup-0.3.8.exe'
    if (!(Test-Path -LiteralPath $installer -PathType Leaf)) {
        throw 'Extract the entire ZIP before running UPDATE.cmd.'
    }
    $source = Join-Path $env:APPDATA 'Tempo'
    if (!(Test-Path -LiteralPath $source -PathType Container)) {
        throw 'Existing Tempo data was not found. See the update guide before proceeding.'
    }
    $backupRoot = Join-Path $env:USERPROFILE 'Tempo-Backups'
    $backup = Join-Path $backupRoot ('before-0.3.8-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $backup -Recurse -Force
    foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File -Force) {
        $relative = $file.FullName.Substring($source.Length).TrimStart('\')
        $copy = Join-Path $backup $relative
        if (!(Test-Path -LiteralPath $copy -PathType Leaf) -or
            (Get-FileHash -LiteralPath $file.FullName).Hash -ne (Get-FileHash -LiteralPath $copy).Hash) {
            throw ('Backup verification failed: ' + $relative)
        }
    }
    Write-Host ('Backup verified: ' + $backup)
    Write-Host 'Install into the SAME folder as your existing Tempo installation.'
    $result = Start-Process -FilePath $installer -Wait -PassThru
    if ($result.ExitCode -ne 0) { throw ('Installer returned code ' + $result.ExitCode) }
    Write-Host 'Installer finished. Open Tempo and check your settings and history.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Update stopped. Existing data has not been deleted.'
    Read-Host 'Press Enter to close'
    exit 1
}
Read-Host 'Press Enter to close'
