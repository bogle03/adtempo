function Get-DaylogStartupPath {
    if ($env:TEMPO_EXE) {
        $dir = if ($env:DAYLOG_STARTUP_DIR) { $env:DAYLOG_STARTUP_DIR } else { [Environment]::GetFolderPath('Startup') }
        return (Join-Path $dir 'Tempo.lnk')
    }
    if ($env:DAYLOG_STARTUP_DIR) { return (Join-Path $env:DAYLOG_STARTUP_DIR 'Daylog.lnk') }
    Join-Path ([Environment]::GetFolderPath('Startup')) 'Daylog.lnk'
}
function Get-DaylogStartupEnabled {
    $linkPath = Get-DaylogStartupPath
    if (-not (Test-Path -LiteralPath $linkPath)) { return $false }
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($linkPath)
    if ($env:TEMPO_EXE) { return ($shortcut.TargetPath -eq $env:TEMPO_EXE -and $shortcut.Arguments -eq '--quiet') }
    return ($shortcut.Arguments -like ('*' + (Join-Path $PSScriptRoot 'launch.vbs') + '*'))
}
function Set-DaylogStartup([bool]$Enabled) {
    if ($env:TEMPO_EXE) {
        $linkPath = Get-DaylogStartupPath
        $shell = New-Object -ComObject WScript.Shell
        if ((Test-Path -LiteralPath $linkPath) -and -not (Get-DaylogStartupEnabled)) { throw 'An unrelated Tempo startup shortcut already exists.' }
        if ($Enabled) {
            $shortcut = $shell.CreateShortcut($linkPath)
            $shortcut.TargetPath = $env:TEMPO_EXE
            $shortcut.Arguments = '--quiet'
            $shortcut.WorkingDirectory = Split-Path $env:TEMPO_EXE -Parent
            $shortcut.IconLocation = $env:TEMPO_EXE + ',0'
            $shortcut.Description = 'Tempo activity tracker'
            $shortcut.Save()
        } elseif (Test-Path -LiteralPath $linkPath) { Remove-Item -LiteralPath $linkPath }
        return
    }
    $linkPath = Get-DaylogStartupPath
    $launcher = Join-Path $PSScriptRoot 'launch.vbs'
    $shell = New-Object -ComObject WScript.Shell
    if (Test-Path -LiteralPath $linkPath) {
        $existing = $shell.CreateShortcut($linkPath)
        if ($existing.Arguments -notlike ('*' + $launcher + '*')) {
            throw 'An unrelated Daylog startup shortcut already exists.'
        }
    }
    if ($Enabled) {
        $shortcut = $shell.CreateShortcut($linkPath)
        $shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
        $shortcut.Arguments = '"' + $launcher + '" --quiet'
        $shortcut.WorkingDirectory = Split-Path $PSScriptRoot -Parent
        $shortcut.Description = 'Tempo activity tracker and tray'
        $shortcut.IconLocation = (Join-Path (Split-Path $PSScriptRoot -Parent) 'assets\tempo-taskbar.ico') + ',0'
        $shortcut.WindowStyle = 7
        $shortcut.Save()
    } elseif (Test-Path -LiteralPath $linkPath) {
        Remove-Item -LiteralPath $linkPath
    }
}
