Option Explicit
Dim shell, files, project, executable, command, quiet
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
project = files.GetParentFolderName(files.GetParentFolderName(WScript.ScriptFullName))
executable = files.BuildPath(project, "node_modules\electron\dist\electron.exe")
If Not files.FileExists(executable) Then
    MsgBox "Tempo runtime is missing. Run npm install in the Daylog folder.", 16, "Tempo"
    WScript.Quit 1
End If
quiet = ""
If WScript.Arguments.Count > 0 Then
    If WScript.Arguments(0) = "--quiet" Then quiet = " --quiet"
End If
shell.CurrentDirectory = project
command = """" & executable & """ """ & project & """" & quiet
shell.Run command, 1, False
