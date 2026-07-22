Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# ── Form ──────────────────────────────────────────────────────
$form                  = New-Object System.Windows.Forms.Form
$form.Text             = "Mshalh - Setup"
$form.ClientSize       = New-Object System.Drawing.Size(500, 370)
$form.StartPosition    = "CenterScreen"
$form.FormBorderStyle  = "FixedDialog"
$form.MaximizeBox      = $false
$form.MinimizeBox      = $false
$form.BackColor        = [System.Drawing.Color]::FromArgb(248, 244, 236)

$gold = [System.Drawing.Color]::FromArgb(183, 140, 42)
$dark = [System.Drawing.Color]::FromArgb(92, 64, 51)

# Header panel
$header            = New-Object System.Windows.Forms.Panel
$header.Location   = New-Object System.Drawing.Point(0, 0)
$header.Size       = New-Object System.Drawing.Size(500, 70)
$header.BackColor  = [System.Drawing.Color]::FromArgb(62, 39, 35)
$form.Controls.Add($header)

$lblTitle           = New-Object System.Windows.Forms.Label
$lblTitle.Text      = "  Mshalh - First Time Setup"
$lblTitle.Font      = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$lblTitle.ForeColor = $gold
$lblTitle.Location  = New-Object System.Drawing.Point(10, 20)
$lblTitle.Size      = New-Object System.Drawing.Size(480, 35)
$header.Controls.Add($lblTitle)

# Progress bar
$pbr               = New-Object System.Windows.Forms.ProgressBar
$pbr.Location      = New-Object System.Drawing.Point(20, 85)
$pbr.Size          = New-Object System.Drawing.Size(460, 18)
$pbr.Minimum       = 0
$pbr.Maximum       = 100
$pbr.Value         = 0
$form.Controls.Add($pbr)

# Step label
$lblStep            = New-Object System.Windows.Forms.Label
$lblStep.Text       = "Starting..."
$lblStep.Font       = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$lblStep.ForeColor  = $dark
$lblStep.Location   = New-Object System.Drawing.Point(20, 108)
$lblStep.Size       = New-Object System.Drawing.Size(460, 24)
$form.Controls.Add($lblStep)

# Log box
$log               = New-Object System.Windows.Forms.RichTextBox
$log.Location      = New-Object System.Drawing.Point(20, 138)
$log.Size          = New-Object System.Drawing.Size(460, 190)
$log.ReadOnly      = $true
$log.Font          = New-Object System.Drawing.Font("Consolas", 8.5)
$log.BackColor     = [System.Drawing.Color]::FromArgb(30, 20, 15)
$log.ForeColor     = [System.Drawing.Color]::FromArgb(220, 200, 160)
$log.BorderStyle   = "None"
$form.Controls.Add($log)

# ── Helpers ───────────────────────────────────────────────────
function AddLog($msg) {
    $log.AppendText("$msg`n")
    $log.SelectionStart = $log.TextLength
    $log.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function SetStep($msg, $pct) {
    $lblStep.Text  = $msg
    $pbr.Value     = [Math]::Min($pct, 100)
    AddLog "> $msg"
}

function RunStep($label, $pct, $dir, $cmd) {
    SetStep $label $pct
    $job = Start-Job -ScriptBlock {
        param($d, $c)
        Set-Location $d
        $out = cmd /c $c 2>&1
        return @{ Code = $LASTEXITCODE; Out = ($out -join "`n") }
    } -ArgumentList $dir, $cmd

    $dots = 0
    while ($job.State -eq 'Running') {
        $dots = ($dots % 3) + 1
        $lblStep.Text = $label + ('.' * $dots)
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 400
    }
    $res = Receive-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force

    if ($null -eq $res -or $res.Code -ne 0) {
        AddLog "ERROR: $($res.Out)"
        [System.Windows.Forms.MessageBox]::Show(
            "Step failed: $label`n`nSee log for details.",
            "Setup Error", "OK", "Error") | Out-Null
        return $false
    }
    AddLog "  OK"
    return $true
}

# ── Main setup flow (runs when form appears) ──────────────────
$form.Add_Shown({
    # 1. Check Node.js
    SetStep "Checking Node.js..." 5
    $nodeExe = (Get-Command node -ErrorAction SilentlyContinue)
    if (-not $nodeExe) {
        [System.Windows.Forms.MessageBox]::Show(
            "Node.js not found!`n`n1. Download from: https://nodejs.org`n2. RESTART your PC`n3. Run setup.bat again",
            "Missing Requirement", "OK", "Error") | Out-Null
        $form.Close(); return
    }
    $nodeVer = & node -v 2>&1
    AddLog "  Node.js $nodeVer"

    # 2. .env
    SetStep "Creating config..." 8
    $envPath = "$root\backend\.env"
    if (-not (Test-Path $envPath)) {
        Copy-Item "$root\backend\.env.example" $envPath
    }
    AddLog "  .env ready"

    # 3. npm install backend
    if (-not (RunStep "Installing backend packages (2-3 min)" 10 "$root\backend" "npm install")) { return }
    $pbr.Value = 45

    # 4. Prisma db push
    if (-not (RunStep "Creating database" 48 "$root\backend" "npx prisma db push")) { return }

    # 5. Seed
    if (-not (RunStep "Loading initial data" 60 "$root\backend" "npx ts-node prisma/seed.ts")) { return }

    # 6. npm install desktop
    if (-not (RunStep "Installing desktop packages (2-3 min)" 65 "$root\desktop" "npm install")) { return }
    $pbr.Value = 78

    # 7. Build desktop (so it runs without a dev server)
    if (-not (RunStep "Building desktop app (1-2 min)" 80 "$root\desktop" "npm run build")) { return }
    $pbr.Value = 90

    # 9. Generate icon
    SetStep "Creating icon..." 92
    try {
        $resDir = "$root\desktop\resources"
        if (-not (Test-Path $resDir)) { New-Item -ItemType Directory $resDir -Force | Out-Null }
        $icoPath = "$resDir\icon.ico"
        if (-not (Test-Path $icoPath)) {
            $bmp = New-Object System.Drawing.Bitmap(64, 64)
            $g   = [System.Drawing.Graphics]::FromImage($bmp)
            $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(183,140,42))), 0, 0, 64, 64)
            $sf  = New-Object System.Drawing.StringFormat
            $sf.Alignment     = [System.Drawing.StringAlignment]::Center
            $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
            $fnt = New-Object System.Drawing.Font("Arial", 30, [System.Drawing.FontStyle]::Bold)
            $g.DrawString("M", $fnt, [System.Drawing.Brushes]::White, [System.Drawing.RectangleF]::new(0,0,64,64), $sf)
            $g.Dispose()
            $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
            $fs   = New-Object System.IO.FileStream($icoPath, "Create")
            $icon.Save($fs); $fs.Close()
            $icon.Dispose(); $bmp.Dispose()
            AddLog "  Icon created: $icoPath"
        } else { AddLog "  Icon already exists" }
    } catch { AddLog "  Icon skipped (non-critical)" }

    # 10. Desktop shortcut
    SetStep "Creating desktop shortcut..." 96
    try {
        $fso  = New-Object -ComObject Scripting.FileSystemObject
        $desk = $fso.GetFolder([Environment]::GetFolderPath('Desktop')).ShortPath
        $ws   = New-Object -ComObject WScript.Shell
        $sc   = $ws.CreateShortcut("$desk\Mshalh.lnk")
        $sc.TargetPath       = 'wscript.exe'
        $sc.Arguments        = "/nologo `"$root\start.vbs`""
        $sc.WorkingDirectory = $root
        $icoFile = "$root\desktop\resources\icon.ico"
        if (Test-Path $icoFile) { $sc.IconLocation = $icoFile }
        else { $sc.IconLocation = 'shell32.dll,13' }
        $sc.Save()
        AddLog "  Shortcut on Desktop"
    } catch { AddLog "  Shortcut failed (create manually)" }

    # Done
    SetStep "Setup complete!" 100
    AddLog ""
    AddLog "Login credentials:"
    AddLog "  admin.mshalh   /  Admin@Mshalh#25"
    AddLog "  naseem.mshalh  /  Naseem@Br#2025"
    AddLog "  olaya.mshalh   /  Olaya@Br#2025"
    AddLog "  mihaf.mshalh   /  Mihaf@Br#2025"
    AddLog "  deera.mshalh   /  Deera@Br#2025"

    [System.Windows.Forms.MessageBox]::Show(
        "Setup complete!`n`nDouble-click 'Mshalh' on your Desktop to start the app.",
        "Mshalh - Ready!", "OK", "Information") | Out-Null
    $form.Close()
})

[System.Windows.Forms.Application]::Run($form)
