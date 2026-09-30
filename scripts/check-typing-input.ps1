$ErrorActionPreference='Stop'
$source=Get-Content (Join-Path $PSScriptRoot '../windows/typing-input.ps1') -Raw
$code=[regex]::Match($source,"(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -TypeDefinition $code
$callback=[TempoTypingInput].GetMethod('OnKey',[Reflection.BindingFlags]'NonPublic,Static')
$memory=[Runtime.InteropServices.Marshal]::AllocHGlobal(4)
function Send-TestKey([int]$key,[int]$message){[Runtime.InteropServices.Marshal]::WriteInt32($memory,$key);$callback.Invoke($null,@(0,[IntPtr]$message,$memory)) | Out-Null}
try {
 Send-TestKey 65 0x100; Send-TestKey 65 0x100
 if(([TempoTypingInput]::Take() -join ',') -ne 'PRESS'){throw 'Repeated press mismatch'}
 Send-TestKey 66 0x100; Send-TestKey 65 0x101
 if(([TempoTypingInput]::Take() -join ',') -ne 'PRESS'){throw 'Second key press missing'}
 Send-TestKey 66 0x101
 if([TempoTypingInput]::Take().Length -ne 0){throw 'Release must not switch images'}
 for($i=0;$i -lt 20;$i++){Send-TestKey 65 0x100;Send-TestKey 65 0x101}
 $signals=[TempoTypingInput]::Take()
 if($signals.Length -ne 20){throw 'Rapid transitions lost'}
 foreach($signal in $signals){if($signal -ne 'PRESS'){throw 'Unexpected release signal'}}
 Write-Output 'PASS: press, repeat, multi-key release and 20 rapid press/release cycles'
} finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($memory) }
