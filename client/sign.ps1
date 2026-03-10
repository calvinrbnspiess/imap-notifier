# IMAP Notifier - Patch + Sign
# Run from the client\ directory on a Windows machine after: neu build --release --embed-resources

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$exe = Get-ChildItem ".\dist" -Recurse -Filter "ImapNotifier*.exe" -ErrorAction SilentlyContinue |
       Select-Object -First 1 -ExpandProperty FullName

if (-not $exe) {
    Write-Error "No ImapNotifier*.exe found in .\dist\`nContents of .\dist\: $(Get-ChildItem '.\dist\' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name | Out-String)"
    exit 1
}

# ── 1. Patch version info + icon ──────────────────────────────────────────────
$rcedit = ".\tools\rcedit.exe"
if (-not (Test-Path $rcedit)) {
    Write-Host "Downloading rcedit ..."
    New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "tools") | Out-Null
    Invoke-WebRequest -Uri "https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe" `
                      -OutFile $rcedit -UseBasicParsing
    Unblock-File -Path $rcedit
}

Write-Host "Patching version info ..."
$rceditArgs = @(
    $exe,
    '--set-version-string', 'FileDescription',  'IMAP Notifier - Erzeuge Desktop-Benachrichtigungen bei E-Mail-Eingang',
    '--set-version-string', 'ProductName',       'IMAP Notifier',
    '--set-version-string', 'CompanyName',       'Calvin Reibenspiess',
    '--set-version-string', 'InternalName',      'ImapNotifier',
    '--set-file-version',   '1.0.0.0',
    '--set-product-version', '1.0.0.0'
)
$icoFile = Join-Path $PSScriptRoot "resources\icons\appIcon.ico"
if (-not (Test-Path $icoFile)) {
    Write-Error "Icon not found: $icoFile"
    exit 1
}
$rceditArgs += '--set-icon', $icoFile
Write-Host "  -> embedding icon from $icoFile"
& $rcedit @rceditArgs

# ── 2. Code signing ───────────────────────────────────────────────────────────
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

if (-not $signtool) {
    Write-Error "signtool.exe not found. Install Windows SDK: winget install Microsoft.WindowsSDK"
    exit 1
}

Write-Host "Signing $exe ..."
& $signtool sign `
    /sha1 $cert.Thumbprint `
    /fd   SHA256 `
    /td   SHA256 `
    /tr   "http://timestamp.digicert.com" `
    $exe

Write-Host "Signed: $exe"
