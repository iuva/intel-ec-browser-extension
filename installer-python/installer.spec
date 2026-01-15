# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from pathlib import Path

# 设置路径
dist_path = Path("../dist").resolve()
public_path = Path("../public").resolve()
icon_path = Path("icon.ico").resolve()

# 检查路径是否存在
if not dist_path.exists():
    raise FileNotFoundError(f"dist目录不存在: {dist_path}")

if not icon_path.exists():
    raise FileNotFoundError(f"图标文件不存在: {icon_path}")

# 分析脚本
a = Analysis(
    ['main.py'],
    pathex=[os.getcwd()],
    binaries=[],
    datas=[
        (str(dist_path), 'dist'),
        (str(public_path), 'public'),
        (str(icon_path), '.')
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# 打包
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# 可执行文件配置
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ec-chrome-extension-installer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(icon_path),  # 明确指定图标路径
)

print(f"✅ 使用spec文件构建，图标路径: {icon_path}")