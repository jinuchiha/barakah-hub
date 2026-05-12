# ============================================================================
#  Barakah Hub - One-Click Android APK Builder
# ============================================================================
#  This script will:
#    1. Download Android command-line tools (~150 MB)
#    2. Install Android SDK platform-tools, build-tools, platforms (~500 MB)
#    3. Configure environment variables
#    4. Generate a release keystore
#    5. Build the release APK
#    6. Copy the APK to your Desktop for easy access
#
#  Total time: 20-40 minutes (depending on internet speed)
#  Required disk space: ~2 GB
#  Required: Windows 10/11, Java 17 (already installed), Node.js (installed)
# ============================================================================

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Stderr from native tools (sdkmanager, gradle, etc) is informational —
# we judge success/failure via $LASTEXITCODE, not via stderr presence.

# Color helpers
function Write-Step($msg) { Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR]  $msg" -ForegroundColor Red }

# Banner
Write-Host @"

================================================================
  BARAKAH HUB - Android APK Build Script
  Building production-grade APK for installation
================================================================
"@ -ForegroundColor Magenta

# ---------------------------------------------------------------------------
# Step 0: Verify project location
# ---------------------------------------------------------------------------
$ProjectRoot = "C:\Users\Uchiha\Desktop\FR\mobile"
if (-not (Test-Path $ProjectRoot)) {
    Write-Err "Project not found at $ProjectRoot"
    exit 1
}
Set-Location $ProjectRoot
Write-Ok "Project: $ProjectRoot"

# ---------------------------------------------------------------------------
# Step 1: Set up Android SDK directory
# ---------------------------------------------------------------------------
Write-Step "Setting up Android SDK paths..."
$SdkRoot = "C:\Android\sdk"
$CmdlineTools = "$SdkRoot\cmdline-tools\latest"
New-Item -ItemType Directory -Force -Path "$SdkRoot\cmdline-tools" | Out-Null

# ---------------------------------------------------------------------------
# Step 2: Download Android command-line tools
# ---------------------------------------------------------------------------
if (-not (Test-Path "$CmdlineTools\bin\sdkmanager.bat")) {
    Write-Step "Downloading Android command-line tools (~150 MB, takes 2-5 min)..."
    $ZipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $ZipPath = "$SdkRoot\cmdline-tools.zip"

    Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing
    Write-Ok "Downloaded."

    Write-Step "Extracting tools..."
    Expand-Archive -Path $ZipPath -DestinationPath "$SdkRoot\cmdline-tools\_temp" -Force

    # Move from cmdline-tools/_temp/cmdline-tools/* to cmdline-tools/latest/*
    if (Test-Path $CmdlineTools) { Remove-Item -Recurse -Force $CmdlineTools }
    Move-Item "$SdkRoot\cmdline-tools\_temp\cmdline-tools" $CmdlineTools
    Remove-Item -Recurse -Force "$SdkRoot\cmdline-tools\_temp"
    Remove-Item $ZipPath
    Write-Ok "Extracted to $CmdlineTools"
} else {
    Write-Ok "Command-line tools already installed."
}

# ---------------------------------------------------------------------------
# Step 3: Set environment variables for this session
# ---------------------------------------------------------------------------
Write-Step "Configuring environment..."
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:Path = "$CmdlineTools\bin;$SdkRoot\platform-tools;$SdkRoot\emulator;$env:Path"

# Also persist for future sessions
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkRoot, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $SdkRoot, "User")
Write-Ok "ANDROID_HOME = $SdkRoot"

# Verify Java
if (-not $env:JAVA_HOME) {
    $javaBin = (Get-Command java).Source
    if ($javaBin) {
        $env:JAVA_HOME = (Get-Item $javaBin).Directory.Parent.FullName
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $env:JAVA_HOME, "User")
        Write-Ok "JAVA_HOME = $env:JAVA_HOME"
    } else {
        Write-Err "Java not found in PATH!"
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Step 4: Install required SDK packages
# ---------------------------------------------------------------------------
Write-Step "Installing required Android SDK packages (~500 MB, takes 5-15 min)..."
Write-Host "      Accepting licenses..." -ForegroundColor DarkGray

# Auto-accept licenses
$LicenseInput = "y`ny`ny`ny`ny`ny`ny`ny`ny`ny`n"
$LicenseInput | & "$CmdlineTools\bin\sdkmanager.bat" --licenses 2>&1 | Out-Null

Write-Host "      Installing platform-tools..." -ForegroundColor DarkGray
& "$CmdlineTools\bin\sdkmanager.bat" "platform-tools" "platforms;android-34" "build-tools;34.0.0" 2>&1 | Tee-Object -Variable sdkOut | Out-Host

if ($LASTEXITCODE -ne 0) {
    Write-Err "SDK installation failed."
    exit 1
}
Write-Ok "SDK packages installed."

# ---------------------------------------------------------------------------
# Step 5: Ensure node modules are installed
# ---------------------------------------------------------------------------
Write-Step "Verifying node dependencies..."
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "      Running npm install (this may take 3-5 min)..." -ForegroundColor DarkGray
    npm install --legacy-peer-deps 2>&1 | Out-Host
}
Write-Ok "Node modules ready."

# ---------------------------------------------------------------------------
# Step 6: Regenerate Android folder via Expo prebuild
# ---------------------------------------------------------------------------
Write-Step "Generating Android native project (expo prebuild)..."

# Expo prebuild refuses to run with a dirty git tree.
# Stash mobile/ changes silently so prebuild proceeds, then pop the stash.
$RepoRoot = "C:\Users\Uchiha\Desktop\FR"
Push-Location $RepoRoot

$stashed = $false
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "      Stashing uncommitted changes temporarily..." -ForegroundColor DarkGray
    git stash push --include-untracked --quiet -m "build-apk: temp stash" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $stashed = $true
        Write-Ok "Changes stashed."
    }
}

Pop-Location
Push-Location $ProjectRoot

try {
    npx --yes expo prebuild --platform android --no-install 2>&1 | Out-Host
    $prebuildExit = $LASTEXITCODE
} finally {
    Pop-Location

    # Restore stashed changes regardless of prebuild result
    if ($stashed) {
        Push-Location $RepoRoot
        Write-Host "      Restoring stashed changes..." -ForegroundColor DarkGray
        git stash pop --quiet 2>&1 | Out-Null
        Pop-Location
    }
}

if ($prebuildExit -ne 0) {
    Write-Warn "Prebuild reported issues, but android/ folder may still be usable."
}
Write-Ok "Android project generated."

# ---------------------------------------------------------------------------
# Step 7: Generate release keystore (if missing)
# ---------------------------------------------------------------------------
Write-Step "Setting up release signing keystore..."
$KeystorePath = "$ProjectRoot\android\app\release.keystore"
if (-not (Test-Path $KeystorePath)) {
    Write-Host "      Creating new keystore..." -ForegroundColor DarkGray
    & keytool -genkeypair -v `
        -storetype PKCS12 `
        -keystore $KeystorePath `
        -alias barakah `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass barakah123 `
        -keypass barakah123 `
        -dname "CN=Barakah Hub, OU=Mobile, O=Barakah, L=Karachi, ST=Sindh, C=PK" 2>&1 | Out-Host
    Write-Ok "Keystore created at $KeystorePath"
} else {
    Write-Ok "Keystore already exists."
}

# ---------------------------------------------------------------------------
# Step 8: Configure gradle.properties for signing
# ---------------------------------------------------------------------------
Write-Step "Configuring release signing..."
$GradleProps = "$ProjectRoot\android\gradle.properties"
$signingLines = @"

# Release signing config
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=barakah
MYAPP_RELEASE_STORE_PASSWORD=barakah123
MYAPP_RELEASE_KEY_PASSWORD=barakah123
"@

$currentContent = Get-Content $GradleProps -Raw
if ($currentContent -notmatch "MYAPP_RELEASE_STORE_FILE") {
    Add-Content -Path $GradleProps -Value $signingLines
    Write-Ok "Signing config added to gradle.properties"
} else {
    Write-Ok "Signing already configured."
}

# Patch app/build.gradle to use the release signing config
$AppBuildGradle = "$ProjectRoot\android\app\build.gradle"

# Read using .NET (no BOM artifacts) and strip any pre-existing BOM
$gradleContent = [System.IO.File]::ReadAllText($AppBuildGradle)
if ($gradleContent.Length -gt 0 -and $gradleContent[0] -eq [char]0xFEFF) {
    $gradleContent = $gradleContent.Substring(1)
    Write-Host "      Stripped UTF-8 BOM from build.gradle" -ForegroundColor DarkGray
}

if ($gradleContent -notmatch "signingConfigs\s*\{[\s\S]*release\s*\{[\s\S]*MYAPP_RELEASE_STORE_FILE") {
    # Inject signing config
    $signingBlock = @'
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
'@
    # Insert after android {
    $gradleContent = $gradleContent -replace "(android\s*\{)", "`$1`n$signingBlock"
    # Set signingConfig in release buildType
    $gradleContent = $gradleContent -replace "(buildTypes\s*\{[\s\S]*?release\s*\{)", "`$1`n            signingConfig signingConfigs.release"
    Write-Host "      Writing build.gradle as UTF-8 without BOM..." -ForegroundColor DarkGray
} else {
    Write-Host "      Signing config already present; rewriting file to ensure no BOM..." -ForegroundColor DarkGray
}

# Always write back without BOM to fix any leftover BOM from prior runs
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($AppBuildGradle, $gradleContent, $utf8NoBom)
Write-Ok "build.gradle patched (UTF-8 no BOM)"

# ---------------------------------------------------------------------------
# Step 9: Build the release APK
# ---------------------------------------------------------------------------
Write-Step "Building release APK (this is the longest step: 10-20 min)..."
Set-Location "$ProjectRoot\android"

& .\gradlew.bat assembleRelease --no-daemon 2>&1 | Out-Host

if ($LASTEXITCODE -ne 0) {
    Write-Err "APK build failed. Check errors above."
    Set-Location $ProjectRoot
    exit 1
}

Set-Location $ProjectRoot

# ---------------------------------------------------------------------------
# Step 10: Copy APK to Desktop
# ---------------------------------------------------------------------------
$ApkPath = "$ProjectRoot\android\app\build\outputs\apk\release\app-release.apk"
$DesktopApk = "$env:USERPROFILE\Desktop\BarakahHub.apk"

if (Test-Path $ApkPath) {
    Copy-Item $ApkPath $DesktopApk -Force
    $apkSize = (Get-Item $DesktopApk).Length / 1MB
    Write-Host @"

================================================================
  BUILD SUCCESSFUL!
================================================================

  APK Location: $DesktopApk
  APK Size:     $([math]::Round($apkSize, 2)) MB

  TO INSTALL ON ANDROID PHONE:
  ----------------------------
  1. Enable "Install unknown apps" in your phone's Settings
     (Settings - Apps - Special access - Install unknown apps)
  2. Transfer BarakahHub.apk to your phone (USB / cloud / email)
  3. Tap the APK file on your phone to install
  4. Open Barakah Hub from your app drawer

  TO INSTALL VIA USB (ADB):
  -------------------------
  1. Enable Developer Options on your phone
     (Settings - About phone - Tap "Build number" 7 times)
  2. Enable USB Debugging
     (Settings - Developer options - USB debugging)
  3. Connect phone via USB
  4. Run: adb install "$DesktopApk"

================================================================
"@ -ForegroundColor Green
} else {
    Write-Err "APK not found at expected location: $ApkPath"
    exit 1
}
