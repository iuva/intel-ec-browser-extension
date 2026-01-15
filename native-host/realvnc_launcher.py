#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RealVNC Launcher Native Messaging Host

This script serves as the native messaging host for the RealVNC Launcher browser extension.
It handles launching RealVNC Viewer with specified connection files on Windows and macOS.
"""

import sys
import json
import struct
import subprocess
import os
import platform
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.expanduser('~/realvnc_launcher.log')),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger(__name__)

class RealVNCLauncher:
    def __init__(self):
        self.system = platform.system()
        logger.info(f"RealVNC Launcher initialized on {self.system}")
        
    def get_default_vnc_path(self):
        """Get the default RealVNC Viewer executable path for the current platform."""
        if self.system == "Windows":
            # Common installation paths on Windows
            paths = [
                r"C:\\Program Files\\RealVNC\\VNC Viewer\\vncviewer.exe",
                r"C:\\Program Files (x86)\\RealVNC\\VNC Viewer\\vncviewer.exe",
                r"C:\\Users\\{}\\AppData\\Local\\RealVNC\\VNC Viewer\\vncviewer.exe".format(os.getenv('USERNAME', ''))
            ]
        elif self.system == "Darwin":  # macOS
            paths = [
                "/Applications/VNC Viewer.app/Contents/MacOS/vncviewer",
                "/Applications/VNC Viewer.app",
                os.path.expanduser("~/Applications/VNC Viewer.app")
            ]
        else:  # Linux and other Unix-like systems
            paths = [
                "/usr/bin/vncviewer",
                "/usr/local/bin/vncviewer",
                "/opt/VNC/bin/vncviewer"
            ]
        
        for path in paths:
            if os.path.exists(path):
                logger.info(f"Found RealVNC at: {path}")
                return path
        
        logger.warning("RealVNC Viewer not found in default locations")
        return None
    
    def launch_realvnc(self, connection_file="", custom_vnc_path=""):
        """Launch RealVNC Viewer with optional connection file."""
        try:
            # Determine VNC executable path
            vnc_path = custom_vnc_path if custom_vnc_path else self.get_default_vnc_path()
            
            if not vnc_path:
                raise Exception("RealVNC Viewer not found. Please install RealVNC Viewer or specify custom path.")
            
            # Build command
            if self.system == "Windows":
                # Use start command to launch program on Windows
                cmd = ["cmd", "/c", "start", "", vnc_path]
                if connection_file and os.path.exists(connection_file):
                    cmd.append(connection_file)
                
                # Use subprocess.Popen on Windows to avoid blocking
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
                
            elif self.system == "Darwin":  # macOS
                if vnc_path.endswith(".app"):
                    # Use 'open' command for .app bundles
                    cmd = ["open", vnc_path]
                    if connection_file and os.path.exists(connection_file):
                        cmd.extend(["--args", connection_file])
                else:
                    # Direct executable
                    cmd = [vnc_path]
                    if connection_file and os.path.exists(connection_file):
                        cmd.append(connection_file)
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                
            else:  # Linux and other Unix-like systems
                cmd = [vnc_path]
                if connection_file and os.path.exists(connection_file):
                    cmd.append(connection_file)
                
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            
            logger.info(f"RealVNC launched with command: {' '.join(cmd)}")
            return {
                "success": True,
                "message": "RealVNC Viewer launched successfully",
                "pid": process.pid,
                "command": ' '.join(cmd)
            }
            
        except Exception as e:
            error_msg = f"Failed to launch RealVNC: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    def read_message(self):
        """Read message from stdin using Chrome native messaging protocol."""
        try:
            # Read message length (4 bytes)
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length:
                return None
            
            message_length = struct.unpack('=I', raw_length)[0]
            
            # Read message
            message = sys.stdin.buffer.read(message_length).decode('utf-8')
            return json.loads(message)
            
        except Exception as e:
            logger.error(f"Error reading message: {e}")
            return None
    
    def send_message(self, message):
        """Send message to stdout using Chrome native messaging protocol."""
        try:
            encoded_message = json.dumps(message).encode('utf-8')
            encoded_length = struct.pack('=I', len(encoded_message))
            
            sys.stdout.buffer.write(encoded_length)
            sys.stdout.buffer.write(encoded_message)
            sys.stdout.buffer.flush()
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    def run(self):
        """Main message loop."""
        logger.info("RealVNC Launcher native host started")
        
        try:
            while True:
                message = self.read_message()
                if message is None:
                    break
                
                logger.info(f"Received message: {message}")
                
                action = message.get('action')
                
                if action == 'launch':
                    connection_file = message.get('connectionFile', '')
                    custom_vnc_path = message.get('vncPath', '')
                    svn_content = message.get('svnContent', '')
                    
                    # If there is SVN content, write to file first
                    if svn_content and connection_file:
                        try:
                            # Handle relative paths: convert relative paths to absolute paths
                            import os
                            if not os.path.isabs(connection_file):
                                # If it's a relative path, convert to absolute path relative to script directory
                                script_dir = os.path.dirname(os.path.abspath(__file__))
                                connection_file = os.path.join(script_dir, connection_file)
                            
                            # Ensure directory exists
                            dir_path = os.path.dirname(connection_file)
                            if dir_path and not os.path.exists(dir_path):
                                os.makedirs(dir_path, exist_ok=True)
                                logger.info(f"Created directory: {dir_path}")
                            
                            # Write SVN file
                            with open(connection_file, 'w', encoding='utf-8') as f:
                                f.write(svn_content)
                            logger.info(f"SVN file created: {connection_file}")
                        except Exception as e:
                            logger.error(f"Failed to create SVN file: {e}")
                            self.send_message({
                                "success": False,
                                "error": f"Failed to create SVN file: {e}"
                            })
                            continue
                    
                    result = self.launch_realvnc(connection_file, custom_vnc_path)
                    self.send_message(result)
                    
                elif action == 'ping':
                    self.send_message({
                        "success": True,
                        "message": "pong",
                        "version": "1.0.0",
                        "platform": self.system
                    })
                    
                elif action == 'check_vnc':
                    vnc_path = self.get_default_vnc_path()
                    self.send_message({
                        "success": vnc_path is not None,
                        "vnc_path": vnc_path,
                        "platform": self.system
                    })
                    
                else:
                    self.send_message({
                        "success": False,
                        "error": f"Unknown action: {action}"
                    })
                    
        except KeyboardInterrupt:
            logger.info("Native host interrupted")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            logger.info("RealVNC Launcher native host stopped")

def main():
    """Entry point for the native messaging host."""
    launcher = RealVNCLauncher()
    launcher.run()

if __name__ == '__main__':
    main()