# Portable Python Download Script
# Downloads portable Python for VNC browser extension

param(
    [string]$PythonVersion = "3.11.7",
    [string]$OutputDir = "python-portable"
)

# Set encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Log function
function Write-Log {
    param([string]$Message, [string]$Type = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Type] $Message"
    
    switch ($Type) {
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        default { Write-Host $logMessage -ForegroundColor Cyan }
    }
}

# Download file function
function Download-File {
    param([string]$Url, [string]$OutputPath)
    
    try {
        Write-Log "Downloading: $Url"
        
        # Use WebClient to download
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $OutputPath)
        
        if (Test-Path $OutputPath) {
            Write-Log "Download completed: $OutputPath" "SUCCESS"
            return $true
        } else {
            Write-Log "Download failed: $OutputPath" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Download error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Extract zip file function
function Expand-ZipFile {
    param([string]$ZipPath, [string]$OutputDir)
    
    try {
        Write-Log "Extracting: $ZipPath -> $OutputDir"
        
        # Ensure output directory exists
        if (-not (Test-Path $OutputDir)) {
            New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
        }
        
        # Use .NET to extract
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $OutputDir)
        
        Write-Log "Extraction completed: $OutputDir" "SUCCESS"
        return $true
    } catch {
        Write-Log "Extraction error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Main function
function Main {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "   Portable Python Download Tool" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    
    Write-Log "Python version: $PythonVersion"
    Write-Log "Output directory: $OutputDir"
    
    # Build download URL and file names
    $pythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
    $zipFile = "python-$PythonVersion-portable.zip"
    $localZipFile = "..\$zipFile"
    
    Write-Log "Download URL: $pythonUrl"
    
    # Check if already exists in output directory
    if (Test-Path "$OutputDir\python.exe") {
        Write-Log "Portable Python already exists, skipping download" "WARNING"
        return $true
    }
    
    # Check if local zip file exists in project root
    if (Test-Path $localZipFile) {
        Write-Log "Found local Python package: $localZipFile" "INFO"
        
        # Extract from local file
        if (-not (Expand-ZipFile -ZipPath $localZipFile -OutputDir $OutputDir)) {
            Write-Log "Failed to extract from local package" "ERROR"
            return $false
        }
    } else {
        # Download Python
        Write-Log "Downloading Python from $pythonUrl" "INFO"
        if (-not (Download-File -Url $pythonUrl -OutputPath $zipFile)) {
            Write-Log "Python download failed, please download manually" "ERROR"
            Write-Log "Manual download URL: $pythonUrl" "INFO"
            return $false
        }
        
        # Extract Python
        if (-not (Expand-ZipFile -ZipPath $zipFile -OutputDir $OutputDir)) {
            Write-Log "Python extraction failed" "ERROR"
            return $false
        }
        
        # Save downloaded file to project root for future use
        try {
            Move-Item -Path $zipFile -Destination $localZipFile -Force
            Write-Log "Downloaded package saved to project root: $localZipFile" "SUCCESS"
        } catch {
            Write-Log "Failed to save package to project root: $($_.Exception.Message)" "WARNING"
        }
    }
    
    # Verify Python
    if (Test-Path "$OutputDir\python.exe") {
        Write-Log "Portable Python verification successful" "SUCCESS"
        
        # Get Python version info
        $pythonInfo = & "$OutputDir\python.exe" --version 2>&1
        Write-Log "Python version info: $pythonInfo"
        
        return $true
    } else {
        Write-Log "Portable Python verification failed" "ERROR"
        return $false
    }
}

# Run main function
try {
    $result = Main
    
    if ($result) {
        Write-Host ""
        Write-Host "Portable Python ready!" -ForegroundColor Green
        Write-Host ""
        exit 0
    } else {
        Write-Host ""
        Write-Host "Portable Python preparation failed" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Script execution error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}