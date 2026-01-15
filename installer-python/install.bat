@echo off
chcp 65001 >nul
echo ========================================
echo Chrome Browser Extension Installer
echo ========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Please run this program as administrator
    echo Right-click -> Run as administrator
    pause
    exit /b 1
)

echo ✅ Administrator privileges detected
echo.

:: Run installer
if exist "ec-chrome-extension-installer.exe" (
    echo Starting installer...
    ec-chrome-extension-installer.exe
) else (
    echo ❌ Installer file does not exist
    pause
    exit /b 1
)

echo.
echo Installation completed!
pause
