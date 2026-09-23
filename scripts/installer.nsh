!macro customUnInstall
  ; Keep startup registration across upgrades. The script checks shortcut ownership.
  ${ifNot} ${isUpdated}
    System::Call 'kernel32::SetEnvironmentVariable(t "TEMPO_EXE", t "$INSTDIR\Tempo.exe") i.r0'
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\resources\app\windows\startup-control.ps1" -Action disable'
    Pop $0
  ${endIf}
!macroend
