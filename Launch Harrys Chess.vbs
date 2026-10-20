Option Explicit
' Launch the game beside this script. The desktop shortcut targets this file.
Dim sh, fso, base, port, url, state, pyw, i, edge, candidates, candidate
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
port = "8778"
url = "http://127.0.0.1:" & port & "/index.html"

If Not fso.FileExists(fso.BuildPath(base, "serve.py")) Then
  WScript.Echo "Harry's Chess cannot start: serve.py is missing from " & base
  WScript.Quit 1
End If

state = HealthState()
If state = -1 Then
  WScript.Echo "Harry's Chess cannot start: another service is using port " & port & "."
  WScript.Quit 1
End If

If state = 0 Then
  pyw = FindPythonw()
  If pyw = "" Then
    WScript.Echo "Harry's Chess cannot start: pythonw.exe was not found. Install Python or add it to PATH."
    WScript.Quit 1
  End If
  On Error Resume Next
  sh.Run Quote(pyw) & " " & Quote(fso.BuildPath(base, "serve.py")) & " " & port, 0, False
  If Err.Number <> 0 Then
    WScript.Echo "Harry's Chess could not start its server: " & Err.Description
    WScript.Quit 1
  End If
  On Error GoTo 0
  For i = 1 To 24
    WScript.Sleep 250
    state = HealthState()
    If state <> 0 Then Exit For
  Next
  If state <> 1 Then
    If state = -1 Then
      WScript.Echo "Harry's Chess cannot open: another service answered on port " & port & "."
    Else
      WScript.Echo "Harry's Chess server did not become ready. Run serve.py to see its error."
    End If
    WScript.Quit 1
  End If
End If

If sh.Environment("PROCESS")("NO_OPEN") = "1" Then
  WScript.Echo "Harry's Chess ready at " & url
  WScript.Quit 0
End If

candidates = Array(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe", _
                   sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe")
edge = ""
For Each candidate In candidates
  If fso.FileExists(candidate) Then
    edge = candidate
    Exit For
  End If
Next
If edge <> "" Then
  sh.Run Quote(edge) & " --app=" & Quote(url), 1, False
Else
  sh.Run "explorer.exe " & Quote(url), 1, False
End If
WScript.Quit 0

Function HealthState()
  Dim req, body
  On Error Resume Next
  Set req = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  req.setTimeouts 300, 300, 700, 700
  req.Open "GET", "http://127.0.0.1:" & port & "/__health", False
  req.Send
  If Err.Number <> 0 Then
    Err.Clear
    HealthState = 0
    Exit Function
  End If
  If req.Status = 200 Then
    body = req.responseText
    If InStr(body, """app"":""bowserchess""") > 0 Then
      HealthState = 1
      Exit Function
    End If
  End If
  HealthState = -1
End Function

Function FindPythonw()
  Dim paths, candidate, pathEntry, localRoot, appRoot
  localRoot = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%")
  appRoot = sh.ExpandEnvironmentStrings("%APPDATA%")
  paths = Array(localRoot & "\Programs\Python\Python313\pythonw.exe", _
                localRoot & "\Programs\Python\Python312\pythonw.exe", _
                localRoot & "\Programs\Python\Python311\pythonw.exe", _
                localRoot & "\hermes\hermes-agent\venv\Scripts\pythonw.exe", _
                appRoot & "\uv\python\cpython-3.11-windows-x86_64-none\pythonw.exe")
  For Each candidate In paths
    If fso.FileExists(candidate) Then
      FindPythonw = candidate
      Exit Function
    End If
  Next
  For Each pathEntry In Split(sh.Environment("PROCESS")("PATH"), ";")
    pathEntry = Replace(Trim(pathEntry), """", "")
    If pathEntry <> "" Then
      candidate = fso.BuildPath(pathEntry, "pythonw.exe")
      If fso.FileExists(candidate) Then
        FindPythonw = candidate
        Exit Function
      End If
    End If
  Next
  FindPythonw = ""
End Function

Function Quote(value)
  Quote = """" & value & """"
End Function
