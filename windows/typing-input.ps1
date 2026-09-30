param([int]$ParentId)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TempoTypingInput {
    delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc callback, IntPtr module, uint thread);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("kernel32.dll", CharSet=CharSet.Auto)] static extern IntPtr GetModuleHandle(string name);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    static HookProc callback = OnKey;
    static IntPtr hook;
    static System.Collections.Generic.List<string> signals = new System.Collections.Generic.List<string>();

    static bool[] held = new bool[256];
    static IntPtr OnKey(int code, IntPtr message, IntPtr data) {
        // Only new-press signals leave this process, never key identities.
        if(code >= 0) {
            int key=Marshal.ReadInt32(data),kind=message.ToInt32();
            if(key>=0 && key<held.Length) {
                if(kind==0x100 || kind==0x104){if(!held[key]){held[key]=true;signals.Add("PRESS");}}
                else if(kind==0x101 || kind==0x105)Release(key);
            }
        }
        return CallNextHookEx(hook, code, message, data);
    }
    public static void Start() { hook=SetWindowsHookEx(13,callback,GetModuleHandle(null),0); if(hook==IntPtr.Zero) throw new Exception("Keyboard animation monitor unavailable"); }
    static void Release(int key){if(held[key]){held[key]=false;}}
    public static string[] Take() { string[] value=signals.ToArray();signals.Clear();return value; }
    public static void Reconcile() { for(int key=0;key<held.Length;key++)if(held[key]&&(GetAsyncKeyState(key)&0x8000)==0)Release(key); }
    public static void Stop() { if(hook!=IntPtr.Zero) UnhookWindowsHookEx(hook); }
}
'@
try {
    [TempoTypingInput]::Start()
    [Console]::WriteLine('READY')
    $ticks=0
    while ($true) {
        [System.Windows.Forms.Application]::DoEvents()
        foreach($signal in [TempoTypingInput]::Take()){[Console]::WriteLine($signal)}
        Start-Sleep -Milliseconds 8
        $ticks++
        if($ticks -ge 60){$ticks=0;[TempoTypingInput]::Reconcile();if($ParentId -and !(Get-Process -Id $ParentId -ErrorAction SilentlyContinue)){break}}
    }
} finally { [TempoTypingInput]::Stop() }
