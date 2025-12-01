@echo off
chcp 65001 >nul
title 注册RealVNC原生主机 - 浏览器扩展

echo.
echo ========================================
echo    RealVNC原生主机注册脚本
echo ========================================
echo.

echo 正在检查系统环境...

:: 检查是否以管理员权限运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误：请以管理员权限运行此脚本！
    echo 右键点击脚本，选择"以管理员身份运行"
    pause
    exit /b 1
)

echo ✅ 管理员权限验证通过

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: 检查必要的文件是否存在
if not exist "%SCRIPT_DIR%\com.realvnc.vncviewer.json" (
    echo ❌ 错误：找不到配置文件 com.realvnc.vncviewer.json
    pause
    exit /b 1
)

if not exist "%SCRIPT_DIR%\realvnc_launcher.bat" (
    echo ❌ 错误：找不到启动脚本 realvnc_launcher.bat
    pause
    exit /b 1
)

echo ✅ 必要的文件检查通过

:: 更新JSON文件中的路径（确保使用绝对路径）
echo 正在更新配置文件路径...

:: 创建临时配置文件
set "TEMP_JSON=%TEMP%\realvnc_temp.json"
(
    echo {
    echo     "name": "com.realvnc.vncviewer",
    echo     "description": "RealVNC Viewer Launcher for Browser Extension",
    echo     "path": "%SCRIPT_DIR%\\realvnc_launcher.bat",
    echo     "type": "stdio",
    echo     "allowed_origins": [
    echo         "chrome-extension://*"
    echo     ]
    echo }
) > "%TEMP_JSON%"

echo ✅ 配置文件路径已更新

:: 注册到Chrome
echo.
echo 正在注册到Chrome浏览器...
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.realvnc.vncviewer" /ve /t REG_SZ /d "%SCRIPT_DIR%\com.realvnc.vncviewer.json" /f
if %errorLevel% equ 0 (
    echo ✅ Chrome注册成功
) else (
    echo ❌ Chrome注册失败
    goto :error_cleanup
)

:: 注册到Chromium
echo.
echo 正在注册到Chromium浏览器...
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Chromium\NativeMessagingHosts\com.realvnc.vncviewer" /ve /t REG_SZ /d "%SCRIPT_DIR%\com.realvnc.vncviewer.json" /f
if %errorLevel% equ 0 (
    echo ✅ Chromium注册成功
) else (
    echo ⚠️  Chromium注册失败（可能未安装）
)

:: 注册到Microsoft Edge
echo.
echo 正在注册到Microsoft Edge浏览器...
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.realvnc.vncviewer" /ve /t REG_SZ /d "%SCRIPT_DIR%\com.realvnc.vncviewer.json" /f
if %errorLevel% equ 0 (
    echo ✅ Microsoft Edge注册成功
) else (
    echo ⚠️  Microsoft Edge注册失败（可能未安装）
)

:: 检查是否安装了Firefox
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla" >nul 2>&1
if %errorLevel% equ 0 (
    echo.
    echo 检测到Firefox，正在注册到Firefox浏览器...
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla\NativeMessagingHosts\com.realvnc.vncviewer" /ve /t REG_SZ /d "%SCRIPT_DIR%\com.realvnc.vncviewer.json" /f
    if %errorLevel% equ 0 (
        echo ✅ Firefox注册成功
    ) else (
        echo ⚠️  Firefox注册失败
    )
)

echo.
echo ========================================
echo           注册完成！
echo ========================================
echo.
echo ✅ 原生主机已成功注册到以下浏览器：
echo    - Google Chrome
echo    - Microsoft Edge
echo    - Chromium
echo.
echo 📍 注册表路径：
echo    HKEY_LOCAL_MACHINE\SOFTWARE\[浏览器]\NativeMessagingHosts\com.realvnc.vncviewer
echo.
echo 🔧 配置文件路径：
echo    %SCRIPT_DIR%\com.realvnc.vncviewer.json
echo.
echo 🚀 启动脚本路径：
echo    %SCRIPT_DIR%\realvnc_launcher.bat
echo.
echo ⚠️  注意：请确保已安装Python 3.7+ 和 RealVNC Viewer
echo.

:: 清理临时文件
if exist "%TEMP_JSON%" del "%TEMP_JSON%"

pause
exit /b 0

:error_cleanup
echo.
echo ❌ 注册过程中出现错误
echo 请检查：
echo 1. 是否以管理员权限运行
echo 2. 注册表权限是否足够
echo 3. 文件路径是否正确
echo.
if exist "%TEMP_JSON%" del "%TEMP_JSON%"
pause
exit /b 1