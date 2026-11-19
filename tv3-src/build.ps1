# Marty TV 3 — gera o APK.
#  1) (opcional) atualiza a lista de canais:  .\build.ps1 -Lista
#  2) copia a interface (web\) para dentro do app
#  3) compila com o JDK/SDK/Gradle em C:\Users\Jezus\ferramentas\android-build (fora do TEMP: o Windows apagou a copia antiga)
param([switch]$Lista)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Tools = Join-Path $env:USERPROFILE "ferramentas\android-build"

if ($Lista) {
    Push-Location (Join-Path $Root "catalog")
    node build-catalog.mjs
    if ($LASTEXITCODE -ne 0) { throw "robô da lista falhou" }
    Pop-Location
}

# lista embutida (usada na 1ª abertura / sem internet)
$json = Get-Content (Join-Path $Root "catalog\catalog.json") -Raw -Encoding UTF8
[IO.File]::WriteAllText((Join-Path $Root "web\catalog.js"), "window.BUNDLED_CATALOG=" + $json + ";`n", (New-Object Text.UTF8Encoding $false))
$vodFile = Join-Path $Root "catalog\vod.json"
if (Test-Path $vodFile) {
    $vod = Get-Content $vodFile -Raw -Encoding UTF8
    [IO.File]::WriteAllText((Join-Path $Root "web\vod.js"), "window.BUNDLED_VOD=" + $vod + ";`n", (New-Object Text.UTF8Encoding $false))
}

$assets = Join-Path $Root "android\app\src\main\assets\web"
if (Test-Path $assets) { Remove-Item $assets -Recurse -Force }
New-Item -ItemType Directory -Force -Path $assets | Out-Null
Copy-Item (Join-Path $Root "web\*") $assets -Recurse -Force

$env:JAVA_HOME = (Get-ChildItem (Join-Path $Tools "jdk") -Directory | Where-Object { $_.Name -like "jdk-*" } | Select-Object -First 1).FullName
$env:ANDROID_HOME = Join-Path $Tools "sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = Join-Path $Tools "gradle-home"
[IO.File]::WriteAllText((Join-Path $Root "android\local.properties"), "sdk.dir=" + $env:ANDROID_HOME.Replace("\", "\\"))

& (Join-Path $Root "android\gradlew.bat") -p (Join-Path $Root "android") assembleRelease --no-daemon
if ($LASTEXITCODE -ne 0) { throw "build falhou" }

$apk = Join-Path $Root "android\app\build\outputs\apk\release\app-release.apk"
$out = Join-Path $Root "release\MartyTV-3.1.0.apk"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
Copy-Item $apk $out -Force
Get-Item $out | Select-Object FullName, @{n = "MB"; e = { [math]::Round($_.Length / 1MB, 1) } }
