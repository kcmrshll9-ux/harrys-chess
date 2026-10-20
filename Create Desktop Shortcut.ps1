$base = $PSScriptRoot
$ws = New-Object -ComObject WScript.Shell
$desk = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $desk)) { New-Item -ItemType Directory -Path $desk | Out-Null }
$lnk = Join-Path $desk "Harry's Chess.lnk"
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$sc.Arguments = '"' + "$base\Launch Harrys Chess.vbs" + '"'
$sc.WorkingDirectory = $base
$sc.IconLocation = "$base\app-icon.ico"
$sc.Description = "Harry's Chess - chess vs Harry AI"
$sc.Save()
Write-Output "Shortcut written: $lnk"
