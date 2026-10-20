' Create Desktop Shortcut.vbs
' Creates "Harry's Chess.lnk" on the Desktop targeting the windowless VBS launcher,
' with the King-piece .ico as the icon.
Dim ws, fso, desk, base, lnk, sc
Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
desk = ws.SpecialFolder("Desktop")   ' SpecialFolder is a WScript.Shell method, not an FSO method
lnk = desk & "\Harry's Chess.lnk"
Set sc = ws.CreateShortcut(lnk)      ' CreateShortcut also belongs to WScript.Shell
sc.TargetPath = ws.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\wscript.exe"
sc.Arguments = Chr(34) & base & "\Launch Harrys Chess.vbs" & Chr(34)   ' windowless launch via wscript, mirroring the existing working shortcut
sc.WorkingDirectory = base
sc.IconLocation = base & "\app-icon.ico"
sc.Description = "Harry's Chess - chess vs Harry AI"
sc.Save
WScript.Echo "Shortcut written: " & lnk
