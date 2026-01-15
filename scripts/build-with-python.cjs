#!/usr/bin/env node

/**
 * Smart Build Script - Automatically detect and include portable Python
 * When building browser extension, automatically check if portable Python zip exists in project root
 * If exists, extract to dist directory; if not, download and extract to dist directory
 */

// Use CommonJS format to avoid ES module issues
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  Smart Build - Auto Include Portable Python');
console.log('========================================\n');

// Configuration
const PYTHON_VERSION = '3.11.7';
const PYTHON_ZIP_NAME = `python-${PYTHON_VERSION}-portable.zip`;
const PYTHON_OUTPUT_DIR = path.join('dist', 'python-portable');

/**
 * Check if file exists and is valid
 */
function checkPythonZipExists() {
    const zipPath = path.join(process.cwd(), PYTHON_ZIP_NAME);
    
    if (!fs.existsSync(zipPath)) {
        console.log(`[INFO] Python zip file does not exist: ${PYTHON_ZIP_NAME}`);
        return false;
    }
    
    const stats = fs.statSync(zipPath);
    if (stats.size === 0) {
        console.log(`[WARNING] Python zip file is empty (0 bytes), will re-download`);
        fs.unlinkSync(zipPath); // Delete empty file
        return false;
    }
    
    console.log(`[OK] Found valid Python zip file: ${PYTHON_ZIP_NAME} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return true;
}

/**
 * Extract Python zip file
 */
function extractPythonZip() {
    const zipPath = path.join(process.cwd(), PYTHON_ZIP_NAME);
    const outputDir = path.join(process.cwd(), PYTHON_OUTPUT_DIR);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`[INFO] Extracting Python to: ${PYTHON_OUTPUT_DIR}`);
    
    try {
        // Use PowerShell to extract
        const result = spawnSync('powershell', [
            '-Command',
            `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${outputDir}')`
        ], { stdio: 'inherit' });
        
        if (result.status === 0) {
            console.log('[OK] Python extraction successful');
            return true;
        } else {
            console.log('[ERROR] Python extraction failed');
            return false;
        }
    } catch (error) {
        console.log('[ERROR] Python extraction error:', error.message);
        return false;
    }
}

/**
 * Download portable Python
 */
function downloadPython() {
    console.log(`[INFO] Downloading portable Python...`);
    
    try {
        // Use existing PowerShell download script
        const result = spawnSync('powershell', [
            '-ExecutionPolicy', 'Bypass',
            '-File', './scripts/download_python.ps1',
            '-PythonVersion', PYTHON_VERSION,
            '-OutputDir', PYTHON_OUTPUT_DIR
        ], { stdio: 'inherit' });
        
        if (result.status === 0) {
            console.log('[OK] Python download successful');
            return true;
        } else {
            console.log('[ERROR] Python download failed');
            return false;
        }
    } catch (error) {
        console.log('[ERROR] Python download error:', error.message);
        return false;
    }
}

/**
 * Verify Python is available
 */
function verifyPython() {
    const pythonExe = path.join(process.cwd(), PYTHON_OUTPUT_DIR, 'python.exe');
    
    if (fs.existsSync(pythonExe)) {
        console.log('[OK] Python verification passed: python.exe exists');
        return true;
    } else {
        console.log('[ERROR] Python verification failed: python.exe does not exist');
        return false;
    }
}

/**
 * Build browser extension (use async spawn to avoid hanging)
 */
function buildExtension(browser) {
    return new Promise((resolve) => {
        console.log(`[INFO] Building browser extension: ${browser}`);
        
        const buildProcess = spawn('npm', ['run', `build:dist:${browser}`], { 
            stdio: 'inherit',
            shell: true 
        });
        
        // Set timeout (10 minutes)
        const timeout = setTimeout(() => {
            console.log('[ERROR] Build timeout (10 minutes), forcing process termination');
            buildProcess.kill('SIGTERM');
            resolve(false);
        }, 10 * 60 * 1000); // 10 minutes
        
        buildProcess.on('close', (code) => {
            clearTimeout(timeout);
            
            if (code === 0) {
                console.log('[OK] Browser extension build successful');
                resolve(true);
            } else {
                console.log(`[ERROR] Browser extension build failed, exit code: ${code}`);
                resolve(false);
            }
        });
        
        buildProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.log('[ERROR] Build error:', error.message);
            resolve(false);
        });
    });
}

/**
 * Copy native-host directory to dist directory
 */
function copyNativeHost() {
    const sourceDir = path.join(process.cwd(), 'native-host');
    const destDir = path.join(process.cwd(), 'dist', 'native-host');
    
    if (!fs.existsSync(sourceDir)) {
        console.log('[WARNING] native-host directory does not exist, skipping copy');
        return false;
    }
    
    console.log('[INFO] Copying native-host directory to dist directory');
    
    try {
        // Ensure target directory exists
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Copy all files
        const files = fs.readdirSync(sourceDir);
        let copiedCount = 0;
        
        for (const file of files) {
            const sourcePath = path.join(sourceDir, file);
            const destPath = path.join(destDir, file);
            
            // Skip temp directory
            if (file === 'temp') {
                console.log(`[INFO] Skipping temp directory: ${file}`);
                continue;
            }
            
            const stats = fs.statSync(sourcePath);
            
            if (stats.isDirectory()) {
                // Recursively copy directory
                copyDirectory(sourcePath, destPath);
                copiedCount++;
            } else {
                // Copy file
                fs.copyFileSync(sourcePath, destPath);
                copiedCount++;
            }
        }
        
        console.log(`[OK] Successfully copied ${copiedCount} files/directories to native-host`);
        return true;
    } catch (error) {
        console.log('[ERROR] Failed to copy native-host directory:', error.message);
        return false;
    }
}

/**
 * Recursively copy directory
 */
function copyDirectory(source, destination) {
    // Create target directory
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }
    
    // Copy directory contents
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
 * Main function
 */
async function main() {
    // Get browser type parameter
    const browser = process.argv[2] || 'chrome';
    console.log(`Target browser: ${browser}\n`);
    
    // Debug info: show current working directory and parameters
    console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
    console.log(`[DEBUG] Script parameters: ${process.argv.join(', ')}`);
    
    // Step 1: Check existing Python zip file
    console.log('Step 1: Check portable Python');
    const hasPythonZip = checkPythonZipExists();
    
    // Step 2: Process Python
    console.log('\nStep 2: Process portable Python');
    let pythonProcessed = false;
    
    if (hasPythonZip) {
        // Extract existing zip file
        pythonProcessed = extractPythonZip();
    } else {
        // Download new zip file
        pythonProcessed = downloadPython();
    }
    
    if (!pythonProcessed) {
        console.log('[WARNING] Python processing failed, continuing build without Python');
    }
    
    // Step 3: Verify Python
    console.log('\nStep 3: Verify Python');
    const pythonVerified = verifyPython();
    
    if (pythonVerified) {
        console.log('[SUCCESS] Portable Python included in build');
    }
    
    // Step 4: Build browser extension
    console.log('\nStep 4: Build browser extension');
    const buildSuccess = await buildExtension(browser);
    
    if (!buildSuccess) {
        console.log('\n[ERROR] Build failed');
        process.exit(1);
    }
    
    // Step 5: Copy native-host directory
    console.log('\nStep 5: Copy native-host directory');
    const nativeHostCopied = copyNativeHost();
    
    if (buildSuccess) {
        console.log('\n[SUCCESS] Smart build completed!');
        console.log('========================================');
        console.log(`- Browser extension: dist/`);
        console.log(`- Portable Python: ${pythonVerified ? PYTHON_OUTPUT_DIR : 'Not included'}`);
        console.log(`- Native Host: ${nativeHostCopied ? 'Included' : 'Not included'}`);
        console.log(`- Build mode: ${browser}`);
        console.log('========================================');
    } else {
        console.log('\n[ERROR] Build failed');
        process.exit(1);
    }
}

// Execute main function
if (require.main === module) {
    main();
}

module.exports = { main };