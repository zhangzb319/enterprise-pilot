param(
    [Parameter(Mandatory = $true)]
    [string]$Root
)

$exclude = @('cmd.exe', 'powershell.exe', 'pwsh.exe', 'conhost.exe')

# Normalize root path (strip trailing backslash)
$Root = $Root.TrimEnd('\')
$rootLower = $Root.ToLowerInvariant()

# Match processes whose command line or executable path references the project root.
# Uses case-insensitive contains matching (not -like) to avoid wildcard escaping issues.
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and
    $exclude -notcontains $_.Name -and
    (
        $_.CommandLine.ToLowerInvariant().Contains($rootLower) -or
        ($_.ExecutablePath -and $_.ExecutablePath.ToLowerInvariant().Contains($rootLower))
    )
}

foreach ($p in $procs) {
    try {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
        Write-Output ("STOPPED " + $p.Name + " (PID " + $p.ProcessId + ")")
    } catch {}
}
