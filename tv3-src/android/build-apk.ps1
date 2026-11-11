# ============================================================
#  MinhaTV — build do APK sem Android Studio
#  Baixa JDK + Android SDK + Gradle automaticamente e compila.
#  Uso:  pwsh -ExecutionPolicy Bypass -File build-apk.ps1
# ============================================================
param(
    [string]$TmpRoot = (Join-Path $env:TEMP "minhatv-build")
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Log($m){ Write-Host ("[build] " + $m) -ForegroundColor Cyan }

function Get-File($Url, $Out){
    if (Test-Path $Out) { Remove-Item $Out -Force }  # zip parcial de execução anterior
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        Invoke-WebRequest -Uri $Url -OutFile $Out -UseBasicParsing -MaximumRedirection 10
    } catch {
        Log "Invoke-WebRequest falhou ($Url), tentando curl.exe..."
        & curl.exe -sSL --retry 3 -o $Out $Url
        if ($LASTEXITCODE -ne 0) { throw "Download falhou: $Url" }
    }
}

New-Item -ItemType Directory -Force -Path $TmpRoot | Out-Null

# ---------- 1. JDK 17 (Temurin) ----------
$JdkDir = Join-Path $TmpRoot "jdk"
if (-not (Test-Path $JdkDir)) {
    Log "Baixando JDK 17 (Temurin)..."
    $jdkZip = Join-Path $TmpRoot "jdk.zip"
    Get-File "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse" $jdkZip
    Expand-Archive $jdkZip -DestinationPath $JdkDir -Force
    Remove-Item $jdkZip -Force
}
$JdkHome = Get-ChildItem $JdkDir -Directory | Where-Object { $_.Name -like "jdk-*" } | Select-Object -First 1 -ExpandProperty FullName
if (-not $JdkHome) { throw "JDK não encontrado" }
Log "JDK: $JdkHome"

# ---------- 2. Android SDK command-line tools ----------
$SdkRoot = Join-Path $TmpRoot "sdk"
$CmdTools = Join-Path $SdkRoot "cmdline-tools\latest"
if (-not (Test-Path (Join-Path $CmdTools "bin\sdkmanager.bat"))) {
    Log "Baixando Android SDK command-line tools..."
    $versions = @("13114758","12266719","11076708","10406996","9862592","9477386")
    $ok = $false
    foreach ($v in $versions) {
        $url = "https://dl.google.com/android/repository/commandlinetools-win-${v}_latest.zip"
        try {
            $zip = Join-Path $TmpRoot "cmdtools.zip"
            Get-File $url $zip
            $ex = Join-Path $TmpRoot "cmdtools-ex"
            if (Test-Path $ex) { Remove-Item $ex -Recurse -Force }
            Expand-Archive $zip -DestinationPath $ex -Force
            Remove-Item $zip -Force
            $inner = Join-Path $ex "cmdline-tools"
            if (Test-Path $inner) {
                New-Item -ItemType Directory -Force -Path (Split-Path $CmdTools) | Out-Null
                Move-Item $inner $CmdTools -Force
                $ok = $true
                break
            }
        } catch { Log "versão $v falhou, tentando outra..." }
    }
    if (-not $ok) { throw "Não foi possível baixar o Android SDK command-line tools" }
}

$env:JAVA_HOME = $JdkHome
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot

$SdkManager = Join-Path $CmdTools "bin\sdkmanager.bat"
if (-not (Test-Path (Join-Path $SdkRoot "platforms\android-34"))) {
    Log "Instalando plataforma android-34 e build-tools..."
    $answer = (1..60 | ForEach-Object { "y" }) -join "`n"
    $answer | & $SdkManager --sdk_root=$SdkRoot "platforms;android-34" "build-tools;34.0.0" "platform-tools"
    if ($LASTEXITCODE -ne 0) { throw "sdkmanager falhou" }
}

# ---------- 3. Gradle 8.7 ----------
$GradleDir = Join-Path $TmpRoot "gradle"
$GradleHome = Join-Path $GradleDir "gradle-8.7"
if (-not (Test-Path $GradleHome)) {
    Log "Baixando Gradle 8.7..."
    $gz = Join-Path $TmpRoot "gradle.zip"
    Get-File "https://services.gradle.org/distributions/gradle-8.7-bin.zip" $gz
    Expand-Archive $gz -DestinationPath $GradleDir -Force
    Remove-Item $gz -Force
}
$env:GRADLE_USER_HOME = Join-Path $TmpRoot "gradle-home"

# ---------- 4. local.properties ----------
$sdkPath = $SdkRoot.Replace("\", "\\")
Set-Content -Path (Join-Path $ProjectRoot "local.properties") -Value "sdk.dir=$sdkPath" -Encoding ASCII

# ---------- 5. build ----------
Log "Gerando wrapper e compilando (isso pode demorar na 1ª vez)..."
$gradle = Join-Path $GradleHome "bin\gradle.bat"
& $gradle -p $ProjectRoot wrapper --gradle-version 8.7 --no-daemon
if ($LASTEXITCODE -ne 0) { throw "wrapper falhou" }

$gradlew = Join-Path $ProjectRoot "gradlew.bat"
& $gradlew -p $ProjectRoot assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { throw "assembleDebug falhou" }

# ---------- 6. copiar APK ----------
$apk = Join-Path $ProjectRoot "app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apk)) { throw "APK não gerado" }
$rel = Join-Path (Split-Path $ProjectRoot) "release"
New-Item -ItemType Directory -Force -Path $rel | Out-Null
$final = Join-Path $rel "MartyTV-v1.0.0.apk"
Copy-Item $apk $final -Force
Log "APK pronto: $final"
Get-Item $final | Select-Object FullName, Length, LastWriteTime
