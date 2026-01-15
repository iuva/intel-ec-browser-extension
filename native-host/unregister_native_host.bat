@echo off
chcp 65001 >nul
title Unregister RealVNC Native Host - Browser Extension

echo.
echo ========================================
echo    RealVNC Native Host Uninstall Script
echo ========================================
echo.

echo Checking system environment...

:: Check if running with administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Error: Please run this script with administrator privileges!
    echo Right-click the script and select "Run as administrator"
    pause
    exit /b 1
)

echo ✅ Administrator privileges verified

echo.
echo Unregistering native host entries...

:: Unregister Chrome entry
echo Unregistering Chrome entry...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.realvnc.vncviewer" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Chrome entry deleted
) else (
    echo ⚠️  Chrome entry does not exist or deletion failed
)

:: Unregister Chromium entry
echo Unregistering Chromium entry...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Chromium\NativeMessagingHosts\com.realvnc.vncviewer" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Chromium entry deleted
) else (
    echo ⚠️  Chromium entry does not exist or deletion failed
)

:: Unregister Microsoft Edge entry
echo Unregistering Microsoft Edge entry...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.realvnc.vncviewer" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Microsoft Edge entry deleted
) else (
    echo ⚠️  Microsoft Edge entry does not exist or deletion failed
)

:: Unregister Firefox entry
echo Unregistering Firefox entry...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla\NativeMessagingHosts\com.realvnc.vncviewer" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Firefox entry deleted
) else (
    echo ⚠️  Firefox entry does not exist or deletion failed
)

echo.
echo ========================================
echo           Uninstall Complete!
echo ========================================
echo.
echo ✅ Native host entries have been removed from the following browsers:
echo    - Google Chrome
echo    - Microsoft Edge
echo    - Chromium
echo    - Firefox
echo.
echo 📝 Note:
echo    - Configuration file com.realvnc.vncviewer.json has not been deleted
echo    - Python script realvnc_launcher.py has not been deleted
echo    - For complete cleanup, manually delete the native-host directory
echo.

pause
exit /b 0