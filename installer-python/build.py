#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chrome Browser Extension Installer Packaging Script
Packaging to exe file using PyInstaller
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path


def check_pyinstaller():
    """Check if PyInstaller is installed"""
    try:
        import PyInstaller
        return True
    except ImportError:
        return False


def install_pyinstaller():
    """Install PyInstaller"""
    print("Installing PyInstaller...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("✅ PyInstaller installation successful")
        return True
    except subprocess.CalledProcessError:
        print("❌ PyInstaller installation failed")
        return False


def prepare_resources():
    """Prepare resource files"""
    print("Preparing resource files...")
    
    # Create temporary directory
    temp_dir = Path("temp")
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir()
    
    # Copy dist directory
    dist_path = Path("../dist")
    if not dist_path.exists():
        print("❌ dist directory does not exist, please build the project first")
        return False
    
    # Copy dist directory to temporary directory
    shutil.copytree(dist_path, temp_dir / "dist")
    print("✅ Resource files preparation completed")
    return True


def build_installer():
    """Build installer"""
    print("Starting installer build...")
    
    # Check if dist directory exists
    dist_path = Path("../dist")
    if not dist_path.exists():
        print("❌ dist directory does not exist, please build the project first")
        return False
    
    # PyInstaller configuration
    spec = {
        "name": "ec-chrome-extension-installer",
        "script": "main.py",
        "onefile": True,
        "console": False,
        "icon": None,  # Can add icon file
        "hidden_imports": [],
        "runtime_hooks": [],
        "excludes": [],
        "upx": True,
        "upx_exclude": [],
        "datas": [],
        "binaries": []
    }
    
    # Build command - use absolute paths to ensure correct inclusion of dist directory, image resources and icon files
    dist_absolute_path = dist_path.resolve()
    public_absolute_path = Path("../public").resolve()
    setp_absolute_path = Path("setp").resolve()
    
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--windowed",
        "--name", spec["name"],
        "--add-data", f"{dist_absolute_path}{os.pathsep}dist",
        "--add-data", f"{public_absolute_path}{os.pathsep}public",
        "--add-data", f"{setp_absolute_path}{os.pathsep}setp",  # Add guide step images
        "--distpath", "output",
        "--workpath", "build",
        "--specpath", "build",
        "--clean",
        "main.py"
    ]
    
    # Set exe file icon - use multi-size ICO file containing all sizes
    multi_size_icon_path = Path("icon/multi_size.ico").resolve()
    if multi_size_icon_path.exists():
        # Use absolute path to ensure PyInstaller can correctly find the icon
        cmd.extend(["--icon", str(multi_size_icon_path.resolve())])
        print(f"✅ exe file icon set: {multi_size_icon_path.resolve()}")
        
        # Display icon information
        print(f"📊 Icon file size: {multi_size_icon_path.stat().st_size} bytes")
        print(f"📊 Included sizes: 16x16, 32x32, 48x48, 96x96, 128x128")
    else:
        print("⚠️  Multi-size icon file not found, will use default icon")
    
    try:
        print("Executing build command:")
        print(" ".join(cmd))
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
        
        if result.returncode == 0:
            print("✅ Installer build successful")
            
            # Check output file
            output_file = Path("output") / f"{spec['name']}.exe"
            if output_file.exists():
                file_size = output_file.stat().st_size / (1024 * 1024)  # MB
                print(f"📦 Generated file: {output_file}")
                print(f"📊 File size: {file_size:.2f} MB")
                return True
            else:
                print("❌ Output file not found")
                return False
        else:
            print("❌ Build failed")
            print("Error output:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Build process error: {str(e)}")
        return False


def create_install_script():
    """Create installation script"""
    print("Creating installation script...")
    
    script_content = """@echo off
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
"""
    
    with open("install.bat", "w", encoding="utf-8") as f:
        f.write(script_content)
    
    print("✅ Installation script creation completed")


def cleanup():
    """Clean up temporary files"""
    print("Cleaning up temporary files...")
    
    # Delete temporary directory
    temp_dir = Path("temp")
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    # Delete build directory
    build_dir = Path("build")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    print("✅ Cleanup completed")


def main():
    """Main function"""
    print("=" * 50)
    print("Chrome Browser Extension Installer Build Tool")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 6):
        print("❌ Python 3.6 or higher required")
        return 1
    
    # Check current directory
    current_dir = Path(__file__).parent
    os.chdir(current_dir)
    
    # Check PyInstaller
    if not check_pyinstaller():
        print("PyInstaller not installed, attempting automatic installation...")
        if not install_pyinstaller():
            print("Please install manually: pip install pyinstaller")
            return 1
    
    # Create output directory
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Prepare resources
    if not prepare_resources():
        return 1
    
    # Build installer
    if not build_installer():
        return 1
    
    # Create installation script
    create_install_script()
    
    # Cleanup
    cleanup()
    
    print("\n" + "=" * 50)
    print("🎉 Build completed!")
    print("Generated files:")
    print(f"  • output/ec-chrome-extension-installer.exe - Main installer")
    print(f"  • install.bat - Installation script (recommended)")
    print("\nUsage instructions:")
    print("  1. Right-click install.bat -> Run as administrator")
    print("  2. Or directly run ec-chrome-extension-installer.exe")
    print("=" * 50)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())