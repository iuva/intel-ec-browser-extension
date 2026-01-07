#!/usr/bin/env node

/**
 * 智能构建脚本 - 自动检测并包含Python便携版
 * 在构建浏览器扩展时，自动检查项目根目录是否有Python便携版压缩包
 * 如果有则解压到dist目录，如果没有则下载后解压到dist目录
 */

// 使用CommonJS格式避免ES模块问题
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  智能构建 - 自动包含Python便携版');
console.log('========================================\n');

// 配置
const PYTHON_VERSION = '3.11.7';
const PYTHON_ZIP_NAME = `python-${PYTHON_VERSION}-portable.zip`;
const PYTHON_OUTPUT_DIR = path.join('dist', 'python-portable');

/**
 * 检查文件是否存在且有效
 */
function checkPythonZipExists() {
    const zipPath = path.join(process.cwd(), PYTHON_ZIP_NAME);
    
    if (!fs.existsSync(zipPath)) {
        console.log(`[INFO] Python压缩包不存在: ${PYTHON_ZIP_NAME}`);
        return false;
    }
    
    const stats = fs.statSync(zipPath);
    if (stats.size === 0) {
        console.log(`[WARNING] Python压缩包为空文件 (0字节)，将重新下载`);
        fs.unlinkSync(zipPath); // 删除空文件
        return false;
    }
    
    console.log(`[OK] 找到有效的Python压缩包: ${PYTHON_ZIP_NAME} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return true;
}

/**
 * 解压Python压缩包
 */
function extractPythonZip() {
    const zipPath = path.join(process.cwd(), PYTHON_ZIP_NAME);
    const outputDir = path.join(process.cwd(), PYTHON_OUTPUT_DIR);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`[INFO] 解压Python到: ${PYTHON_OUTPUT_DIR}`);
    
    try {
        // 使用PowerShell解压
        const result = spawnSync('powershell', [
            '-Command',
            `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${outputDir}')`
        ], { stdio: 'inherit' });
        
        if (result.status === 0) {
            console.log('[OK] Python解压成功');
            return true;
        } else {
            console.log('[ERROR] Python解压失败');
            return false;
        }
    } catch (error) {
        console.log('[ERROR] Python解压出错:', error.message);
        return false;
    }
}

/**
 * 下载Python便携版
 */
function downloadPython() {
    console.log(`[INFO] 下载Python便携版...`);
    
    try {
        // 使用现有的PowerShell下载脚本
        const result = spawnSync('powershell', [
            '-ExecutionPolicy', 'Bypass',
            '-File', './scripts/download_python.ps1',
            '-PythonVersion', PYTHON_VERSION,
            '-OutputDir', PYTHON_OUTPUT_DIR
        ], { stdio: 'inherit' });
        
        if (result.status === 0) {
            console.log('[OK] Python下载成功');
            return true;
        } else {
            console.log('[ERROR] Python下载失败');
            return false;
        }
    } catch (error) {
        console.log('[ERROR] Python下载出错:', error.message);
        return false;
    }
}

/**
 * 验证Python是否可用
 */
function verifyPython() {
    const pythonExe = path.join(process.cwd(), PYTHON_OUTPUT_DIR, 'python.exe');
    
    if (fs.existsSync(pythonExe)) {
        console.log('[OK] Python验证通过: python.exe存在');
        return true;
    } else {
        console.log('[ERROR] Python验证失败: python.exe不存在');
        return false;
    }
}

/**
 * 构建浏览器扩展（使用异步spawn避免卡死）
 */
function buildExtension(browser) {
    return new Promise((resolve) => {
        console.log(`[INFO] 构建浏览器扩展: ${browser}`);
        
        const buildProcess = spawn('npm', ['run', `build:dist:${browser}`], { 
            stdio: 'inherit',
            shell: true 
        });
        
        // 设置超时（10分钟）
        const timeout = setTimeout(() => {
            console.log('[ERROR] 构建超时（10分钟），强制终止进程');
            buildProcess.kill('SIGTERM');
            resolve(false);
        }, 10 * 60 * 1000); // 10分钟
        
        buildProcess.on('close', (code) => {
            clearTimeout(timeout);
            
            if (code === 0) {
                console.log('[OK] 浏览器扩展构建成功');
                resolve(true);
            } else {
                console.log(`[ERROR] 浏览器扩展构建失败，退出码: ${code}`);
                resolve(false);
            }
        });
        
        buildProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.log('[ERROR] 构建出错:', error.message);
            resolve(false);
        });
    });
}

/**
 * 复制native-host目录到dist目录
 */
function copyNativeHost() {
    const sourceDir = path.join(process.cwd(), 'native-host');
    const destDir = path.join(process.cwd(), 'dist', 'native-host');
    
    if (!fs.existsSync(sourceDir)) {
        console.log('[WARNING] native-host目录不存在，跳过复制');
        return false;
    }
    
    console.log('[INFO] 复制native-host目录到dist目录');
    
    try {
        // 确保目标目录存在
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // 复制所有文件
        const files = fs.readdirSync(sourceDir);
        let copiedCount = 0;
        
        for (const file of files) {
            const sourcePath = path.join(sourceDir, file);
            const destPath = path.join(destDir, file);
            
            // 跳过temp目录
            if (file === 'temp') {
                console.log(`[INFO] 跳过temp目录: ${file}`);
                continue;
            }
            
            const stats = fs.statSync(sourcePath);
            
            if (stats.isDirectory()) {
                // 递归复制目录
                copyDirectory(sourcePath, destPath);
                copiedCount++;
            } else {
                // 复制文件
                fs.copyFileSync(sourcePath, destPath);
                copiedCount++;
            }
        }
        
        console.log(`[OK] 成功复制 ${copiedCount} 个文件/目录到native-host`);
        return true;
    } catch (error) {
        console.log('[ERROR] 复制native-host目录失败:', error.message);
        return false;
    }
}

/**
 * 递归复制目录
 */
function copyDirectory(source, destination) {
    // 创建目标目录
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }
    
    // 复制目录内容
    const files = fs.readdirSync(source);
    
    for (const file of files) {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        
        const stats = fs.statSync(sourcePath);
        
        if (stats.isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

/**
 * 主函数
 */
async function main() {
    // 获取浏览器类型参数
    const browser = process.argv[2] || 'chrome';
    console.log(`目标浏览器: ${browser}\n`);
    
    // 调试信息：显示当前工作目录和参数
    console.log(`[DEBUG] 当前工作目录: ${process.cwd()}`);
    console.log(`[DEBUG] 脚本参数: ${process.argv.join(', ')}`);
    
    // 步骤1: 检查现有Python压缩包
    console.log('步骤1: 检查Python便携版');
    const hasPythonZip = checkPythonZipExists();
    
    // 步骤2: 处理Python
    console.log('\n步骤2: 处理Python便携版');
    let pythonProcessed = false;
    
    if (hasPythonZip) {
        // 解压现有压缩包
        pythonProcessed = extractPythonZip();
    } else {
        // 下载新压缩包
        pythonProcessed = downloadPython();
    }
    
    if (!pythonProcessed) {
        console.log('[WARNING] Python处理失败，继续构建但不包含Python');
    }
    
    // 步骤3: 验证Python
    console.log('\n步骤3: 验证Python');
    const pythonVerified = verifyPython();
    
    if (pythonVerified) {
        console.log('[SUCCESS] Python便携版已包含在构建中');
    }
    
    // 步骤4: 构建浏览器扩展
    console.log('\n步骤4: 构建浏览器扩展');
    const buildSuccess = await buildExtension(browser);
    
    if (!buildSuccess) {
        console.log('\n[ERROR] 构建失败');
        process.exit(1);
    }
    
    // 步骤5: 复制native-host目录
    console.log('\n步骤5: 复制native-host目录');
    const nativeHostCopied = copyNativeHost();
    
    if (buildSuccess) {
        console.log('\n[SUCCESS] 智能构建完成！');
        console.log('========================================');
        console.log(`- 浏览器扩展: dist/`);
        console.log(`- Python便携版: ${pythonVerified ? PYTHON_OUTPUT_DIR : '未包含'}`);
        console.log(`- Native Host: ${nativeHostCopied ? '已包含' : '未包含'}`);
        console.log(`- 构建模式: ${browser}`);
        console.log('========================================');
    } else {
        console.log('\n[ERROR] 构建失败');
        process.exit(1);
    }
}

// 执行主函数
if (require.main === module) {
    main();
}

module.exports = { main };