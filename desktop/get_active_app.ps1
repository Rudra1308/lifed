Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WinUtil {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public static string GetForegroundInfo() {
        IntPtr hwnd = GetForegroundWindow();
        if (hwnd == IntPtr.Zero) return null;
        StringBuilder sb = new StringBuilder(512);
        GetWindowText(hwnd, sb, 512);
        uint pid = 0;
        GetWindowThreadProcessId(hwnd, out pid);
        string procName = "";
        try {
            procName = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
        } catch {}
        string title = sb.ToString();
        if (string.IsNullOrEmpty(procName) && string.IsNullOrEmpty(title)) return null;
        string safeProc = (procName ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
        string safeTitle = (title ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"");
        return "{\"pid\":" + pid + ",\"process\":\"" + safeProc + "\",\"title\":\"" + safeTitle + "\"}";
    }
}
"@ -ErrorAction SilentlyContinue

$active = [WinUtil]::GetForegroundInfo()

# Find the explorer / user session ID
$session = (Get-Process -Name "explorer" -ErrorAction SilentlyContinue | Select-Object -First 1).SessionId
if (-not $session) { $session = 1 }

# Common user desktop application names to surface in the Notch
$userAppFilter = @(
    "brave", "chrome", "msedge", "firefox", "opera",
    "code", "devenv", "cursor", "sublime_text", "pycharm64", "idea64",
    "notion", "obsidian", "slack", "discord", "spotify", "windowsterminal",
    "cmd", "powershell", "whatsapp", "telegram", "chatgpt classic", "ollama app",
    "postman", "figma", "steam", "electron"
)

$allSessionProcs = Get-Process | Where-Object { $_.SessionId -eq $session }
$uniqueApps = @{}

foreach ($p in $allSessionProcs) {
    $pname = $p.ProcessName.ToLower()
    if ($userAppFilter -contains $pname -or ($p.MainWindowTitle -and $p.MainWindowTitle.Trim().Length -gt 0)) {
        if (-not $uniqueApps.ContainsKey($pname)) {
            $uniqueApps[$pname] = @{
                id = $p.Id
                name = $p.ProcessName
                title = if ($p.MainWindowTitle) { $p.MainWindowTitle } else { $p.ProcessName }
            }
        }
    }
}

$runningList = @($uniqueApps.Values)

# Fallback for active if running inside background shell
if (-not $active -or $active -eq "{}") {
    # Pick the most prominent user app (e.g. Brave if running, else first user app)
    $preferred = $runningList | Where-Object { $_.name -like "*brave*" -or $_.name -like "*code*" } | Select-Object -First 1
    if (-not $preferred -and $runningList.Count -gt 0) {
        $preferred = $runningList[0]
    }
    if ($preferred) {
        $safeP = $preferred.name.Replace('\', '\\').Replace('"', '\"')
        $safeT = $preferred.title.Replace('\', '\\').Replace('"', '\"')
        $active = "{`"pid`":$($preferred.id),`"process`":`"$safeP`",`"title`":`"$safeT`"}"
    } else {
        $active = "{`"pid`":0,`"process`":`"desktop`",`"title`":`"Desktop`"}"
    }
}

$jsonRunning = ($runningList | ConvertTo-Json -Compress)
if (-not $jsonRunning) { $jsonRunning = "[]" }

Write-Output "RESULT_START"
Write-Output "{`"active`":$active,`"running`":$jsonRunning}"
Write-Output "RESULT_END"

