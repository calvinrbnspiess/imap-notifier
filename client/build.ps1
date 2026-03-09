# IMAP Notifier – Build + Sign
# Run from the client\ directory on a Windows machine.
# Requirements: Node.js (for neu CLI), Windows SDK (for signtool).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── 1. Install neu CLI ────────────────────────────────────────────────────────
if (-not (Get-Command neu -ErrorAction SilentlyContinue)) {
    Write-Host "Installing @neutralinojs/neu ..."
    npm install -g @neutralinojs/neu
}

# ── 2. Download NeutralinoJS binaries + neutralino.js client library ──────────
Write-Host "Updating NeutralinoJS binaries ..."
neu update

# ── 3. Build single .exe (resources embedded — no resources.neu needed) ───────
Write-Host "Building notifier.exe ..."
neu build --release --embed-resources

$exe = Get-ChildItem ".\dist\ImapNotifier-win_x64.exe" -ErrorAction SilentlyContinue |
       Select-Object -First 1 -ExpandProperty FullName

if (-not $exe) {
    Write-Error "Build failed — ImapNotifier-win_x64.exe not found in .\dist\"
    exit 1
}

Write-Host "Build complete: $exe"

# ── 4. Patch version info (fixes "A neutralino.js application" in Task Manager) ──
if (-not (Get-Command rcedit -ErrorAction SilentlyContinue)) {
    Write-Host "Installing rcedit ..."
    npm install -g rcedit
}

Write-Host "Patching version info ..."
$rceditArgs = @(
    $exe,
    '--set-version-string', 'FileDescription',  'IMAP Notifier',
    '--set-version-string', 'ProductName',       'IMAP Notifier',
    '--set-version-string', 'CompanyName',       'Calvin Reibenspiess',
    '--set-version-string', 'InternalName',      'ImapNotifier',
    '--set-file-version',   '1.0.0.0',
    '--set-product-version', '1.0.0.0'
)
$icoFile = ".\resources\icons\appIcon.ico"
if (Test-Path $icoFile) {
    $rceditArgs += '--set-icon', (Resolve-Path $icoFile).Path
    Write-Host "  → embedding icon from $icoFile"
}
& rcedit @rceditArgs

# ── 5. Code signing ───────────────────────────────────────────────────────────
$subject = "calvinreibenspiess@gmail.com"

$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert |
        Where-Object { $_.Subject -like "*$subject*" } |
        Select-Object -First 1

if (-not $cert) {
    Write-Host "Creating self-signed code signing certificate for $subject ..."
    $cert = New-SelfSignedCertificate `
        -Subject           "CN=$subject" `
        -Type              CodeSigning `
        -HashAlgorithm     SHA256 `
        -KeyLength         4096 `
        -CertStoreLocation Cert:\CurrentUser\My `
        -NotAfter          (Get-Date).AddYears(5)
    Write-Host "Certificate created. Thumbprint: $($cert.Thumbprint)"
} else {
    Write-Host "Using existing certificate. Thumbprint: $($cert.Thumbprint)"
}

$signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits", "C:\Program Files\Windows Kits" `
                -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "x64" } |
            Select-Object -First 1 -ExpandProperty FullName

if ($signtool) {
    Write-Host "Signing ..."
    & $signtool sign `
        /sha1 $cert.Thumbprint `
        /fd   SHA256 `
        /td   SHA256 `
        /tr   "http://timestamp.digicert.com" `
        $exe
    Write-Host "Signed: $exe"
} else {
    Write-Warning "signtool.exe not found — skipping signing."
    Write-Warning "Install 'Windows SDK' via Visual Studio Installer or: winget install Microsoft.WindowsSDK"
}

Write-Host ""
Write-Host "Output: $exe"
Write-Host "Deploy to: \\<DOMAIN>\SYSVOL\<DOMAIN>\scripts\notifier-win_x64.exe"
