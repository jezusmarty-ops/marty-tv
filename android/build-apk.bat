@echo off
title MinhaTV - Build do APK
echo ============================================
echo   MinhaTV - compilando o APK (1a vez demora)
echo ============================================
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk.ps1"
)
echo.
echo APK em: %~dp0..\release\MartyTV-v1.0.0.apk
pause
