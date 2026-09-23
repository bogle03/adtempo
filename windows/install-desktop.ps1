$ErrorActionPreference = 'Stop'
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$linkPath = Join-Path $desktop 'Tempo.lnk'
$launcher = Join-Path $PSScriptRoot 'launch.vbs'
$project = Split-Path $PSScriptRoot -Parent
$shell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $linkPath) {
    $existing = $shell.CreateShortcut($linkPath)
    if ($existing.Arguments -notlike ('*' + $launcher + '*')) { throw 'An unrelated Tempo shortcut already exists.' }
}
$shortcut = $shell.CreateShortcut($linkPath)
$shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$shortcut.Arguments = '"' + $launcher + '"'
$shortcut.WorkingDirectory = $project
$shortcut.IconLocation = (Join-Path $project 'assets\tempo-taskbar.ico') + ',0'
$shortcut.Description = 'Open Tempo activity tracker'
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output $linkPath
