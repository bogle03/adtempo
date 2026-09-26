function Get-DaylogStartupPath {
    if ($env:TEMPO_EXE) {
        $dir = if ($env:DAYLOG_STARTUP_DIR) { $env:DAYLOG_STARTUP_DIR } else { [Environment]::GetFolderPath('Startup') }
        return (Join-Path $dir 'Tempo.lnk')
    }
    if ($env:DAYLOG_STARTUP_DIR) { return (Join-Path $env:DAYLOG_STARTUP_DIR 'Daylog.lnk') }
    Join-Path ([Environment]::GetFolderPath('Startup')) 'Daylog.lnk'
}
function Get-TempoRunCommand { '"' + $env:TEMPO_EXE + '" --quiet' }
function Get-TempoRunPath { 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' }
function Get-TempoApprovalPath { 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' }
function Get-DaylogStartupEnabled {
    if ($env:TEMPO_EXE) {
        $command = (Get-ItemProperty -Path (Get-TempoRunPath) -ErrorAction SilentlyContinue).Tempo
        $approval = (Get-ItemProperty -Path (Get-TempoApprovalPath) -ErrorAction SilentlyContinue).Tempo
        return ($command -eq (Get-TempoRunCommand) -and (Test-Path -LiteralPath $env:TEMPO_EXE) -and (!$approval -or $approval[0] -in @(2,6)))
    }
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
        $runPath = Get-TempoRunPath
        $command = Get-TempoRunCommand
        $existing = (Get-ItemProperty -Path $runPath -ErrorAction SilentlyContinue).Tempo
        if ($existing -and $existing -ne $command) { throw 'An unrelated Tempo startup entry already exists.' }
        if ($Enabled) {
            if (!(Test-Path -LiteralPath $env:TEMPO_EXE)) { throw 'Tempo executable was not found.' }
            New-Item -Path $runPath -Force | Out-Null
            New-ItemProperty -Path $runPath -Name Tempo -Value $command -PropertyType String -Force | Out-Null
            $approvalPath = Get-TempoApprovalPath
            New-Item -Path $approvalPath -Force | Out-Null
            New-ItemProperty -Path $approvalPath -Name Tempo -Value ([byte[]]@(2,0,0,0,0,0,0,0,0,0,0,0)) -PropertyType Binary -Force | Out-Null
        } elseif ($existing -eq $command) { Remove-ItemProperty -Path $runPath -Name Tempo }
        # Remove only our old shortcut to avoid duplicate launches.
        if (Test-Path -LiteralPath $linkPath) {
            $shortcut = $shell.CreateShortcut($linkPath)
            if ($shortcut.TargetPath -eq $env:TEMPO_EXE -and $shortcut.Arguments -eq '--quiet') { Remove-Item -LiteralPath $linkPath }
        }
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
