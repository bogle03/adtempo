$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class DaylogInputState {
    [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
    [DllImport("kernel32.dll")] static extern uint GetTickCount();
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int x,y; }
    [StructLayout(LayoutKind.Sequential)] public struct MOUSE { public POINT pt; public uint mouseData,flags,time; public UIntPtr extra; }
    delegate IntPtr MouseProc(int code,IntPtr message,IntPtr data);
    [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id,MouseProc proc,IntPtr module,uint thread);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook,int code,IntPtr message,IntPtr data);
    [DllImport("kernel32.dll",CharSet=CharSet.Auto)] static extern IntPtr GetModuleHandle(string name);
    [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT point);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr window,uint flags);
    static MouseProc callback=OnMouse; static IntPtr hook; static uint lastMouse; static IntPtr mouseWindow;
    public static void StartMouse(){hook=SetWindowsHookEx(14,callback,GetModuleHandle(null),0);if(hook==IntPtr.Zero)throw new Exception("Mouse monitor unavailable");}
    static IntPtr OnMouse(int code,IntPtr message,IntPtr data){
        if(code>=0){MOUSE item=(MOUSE)Marshal.PtrToStructure(data,typeof(MOUSE));mouseWindow=GetAncestor(WindowFromPoint(item.pt),2);lastMouse=GetTickCount();}
        return CallNextHookEx(hook,code,message,data);
    }
    public static double MouseIdleMilliseconds(){return mouseWindow!=IntPtr.Zero&&mouseWindow==GetAncestor(GetForegroundWindow(),2)?(double)unchecked(GetTickCount()-lastMouse):-1;}
    public static uint ForegroundPid() { uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); return pid; }
    public static double IdleMilliseconds() {
        LASTINPUTINFO info = new LASTINPUTINFO(); info.cbSize = (uint)Marshal.SizeOf(info);
        if (!GetLastInputInfo(ref info)) return -1;
        return unchecked(GetTickCount() - info.dwTime);
    }
}
'@
[DaylogInputState]::StartMouse()
$sampleCounter=0
while ($true) {
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 50
    $sampleCounter++
    if($sampleCounter -lt 5){continue}
    $sampleCounter=0
    $foregroundName = ''
    try { $foregroundName = (Get-Process -Id ([DaylogInputState]::ForegroundPid()) -ErrorAction Stop).ProcessName } catch {}
    @{foregroundProcess=$foregroundName;idleMs=[DaylogInputState]::IdleMilliseconds();mouseIdleMs=[DaylogInputState]::MouseIdleMilliseconds()} | ConvertTo-Json -Compress

}
