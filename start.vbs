Dim WshShell, fso, root, candidate
Set WshShell = CreateObject("WScript.Shell")
Set fso     = CreateObject("Scripting.FileSystemObject")

' Find project root
root = fso.GetParentFolderName(WScript.ScriptFullName)
If Not fso.FolderExists(root & "\backend\node_modules") Then
    candidate = WshShell.SpecialFolders("MyDocuments") & "\mshalhProject"
    If fso.FolderExists(candidate & "\backend\node_modules") Then
        root = candidate
    Else
        MsgBox "Please run setup.bat first!", vbCritical, "Mshalh"
        WScript.Quit
    End If
End If

' Load full PATH from registry so npm/node are always found in hidden windows
On Error Resume Next
Dim machinePath, userPath
machinePath = WshShell.RegRead("HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\Path")
userPath    = WshShell.RegRead("HKEY_CURRENT_USER\Environment\PATH")
On Error GoTo 0
If machinePath <> "" Or userPath <> "" Then
    WshShell.Environment("Process")("PATH") = machinePath & ";" & userPath & ";" & _
        WshShell.ExpandEnvironmentStrings("%APPDATA%") & "\npm"
End If

' Auto-update: git pull, then invalidate desktop build only if new code arrived
If fso.FolderExists(root & "\.git") Then
    Dim tmpLog
    tmpLog = WshShell.ExpandEnvironmentStrings("%TEMP%") & "\mshalh_pull.txt"
    WshShell.CurrentDirectory = root
    WshShell.Run "cmd /c git pull --quiet > """ & tmpLog & """ 2>&1", 0, True
    On Error Resume Next
    Dim f, pullOut
    Set f = fso.OpenTextFile(tmpLog, 1)
    pullOut = f.ReadAll
    f.Close
    fso.DeleteFile tmpLog
    If InStr(pullOut, "Already up to date") = 0 And Len(Trim(pullOut)) > 0 Then
        fso.DeleteFolder root & "\desktop\out", True
    End If
    On Error GoTo 0
End If

' Build desktop if no built output exists (first run or after update)
If Not fso.FileExists(root & "\desktop\out\main\index.js") Then
    WshShell.CurrentDirectory = root & "\desktop"
    WshShell.Run "cmd /c npm run build", 0, True
End If

' Verify build succeeded
Dim electronExe
electronExe = root & "\desktop\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(root & "\desktop\out\main\index.js") Or Not fso.FileExists(electronExe) Then
    MsgBox "Build failed or Electron not found. Please run setup.bat again.", vbCritical, "Mshalh"
    WScript.Quit
End If

' Start backend (hidden, async — stays alive until PC restarts)
WshShell.CurrentDirectory = root & "\backend"
WshShell.Run "cmd /c npm run dev", 0, False

' Wait for backend to be ready
WScript.Sleep 8000

' Launch Electron with built output — no Vite dev server needed
WshShell.CurrentDirectory = root & "\desktop"
WshShell.Run """" & electronExe & """ """ & root & "\desktop\out\main\index.js""", 1, False
