param(
    [string]$appName,
    [int]$appPid = 0
)

$wshell = New-Object -ComObject Wscript.Shell
$activated = $false

# 1. Try activating by PID
if ($appPid -gt 0) {
    $activated = $wshell.AppActivate($appPid)
}

# 2. Try activating by name
if (-not $activated -and $appName) {
    $cleanName = $appName.Replace(".exe", "").Replace(".Root", "")
    $activated = $wshell.AppActivate($cleanName)
}

# 3. Try Win32 MainWindowHandle restore & focus
if (-not $activated) {
    Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class WinAct {
            [DllImport("user32.dll")]
            public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hWnd);
        }
"@ -ErrorAction SilentlyContinue

    $proc = $null
    if ($appPid -gt 0) {
        $proc = Get-Process -Id $appPid -ErrorAction SilentlyContinue
    }
    if (-not $proc -and $appName) {
        $cleanName = $appName.Replace(".exe", "").Replace(".Root", "")
        $proc = Get-Process -Name "*$cleanName*" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    }

    if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
        if ([WinAct]::IsIconic($proc.MainWindowHandle)) {
            [WinAct]::ShowWindow($proc.MainWindowHandle, 9)
        }
        [WinAct]::SetForegroundWindow($proc.MainWindowHandle)
        $activated = $true
    }
}

# 4. If still not activated or not in foreground, launch via protocol or executable
if (-not $activated) {
    $low = "$appName".ToLower()
    if ($low -like "*whatsapp*") {
        Start-Process "whatsapp:" -ErrorAction SilentlyContinue
    } elseif ($low -like "*spotify*") {
        Start-Process "spotify:" -ErrorAction SilentlyContinue
    } elseif ($low -like "*discord*") {
        Start-Process "discord:" -ErrorAction SilentlyContinue
    } else {
        Start-Process $appName -ErrorAction SilentlyContinue
    }
}
