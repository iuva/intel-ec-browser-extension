#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chrome Browser Extension Installer
Graphical installation wizard based on Python + Tkinter
"""

import os
import sys
import shutil
import winreg
import tkinter as tk
from tkinter import ttk, messagebox, filedialog, PhotoImage
import time
from pathlib import Path
import ctypes
import platform
from PIL import Image, ImageTk


class InstallerApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Chrome Browser Extension Installer")
        self.root.geometry("800x600")
        self.root.resizable(False, False)
        
        # Set window icon (supports development and packaged environments)
        self.set_window_icon()
        
        # Installation path
        self.install_path = r"C:\ec-chrome-extension"
        self.is_update = self.check_update()
        # self.is_update = False
        self.current_step = 0

        self.vnc_json_con = ''
        
        # Create main frame
        self.main_frame = ttk.Frame(self.root)
        self.main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Step title
        self.title_label = ttk.Label(self.main_frame, font=("Arial", 16, "bold"))
        self.title_label.pack(pady=(0, 20))
        
        # Content frame
        self.content_frame = ttk.Frame(self.main_frame)
        self.content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Button frame
        self.button_frame = ttk.Frame(self.main_frame)
        self.button_frame.pack(fill=tk.X, pady=(20, 0))
        
        # Progress bar
        self.progress = ttk.Progressbar(self.main_frame, mode='determinate')
        self.progress.pack(fill=tk.X, pady=(10, 0))
        
        # Status label
        self.status_label = ttk.Label(self.main_frame, text="")
        self.status_label.pack(pady=(5, 0))
        
        # Initialize steps
        self.steps = [
            self.step_welcome,
            self.step_install_files,
            self.step_guide_developer_mode,
            self.step_guide_load_extension,
            self.step_guide_copy_id,
            self.step_guide_enter_id,
            self.step_guide_refresh
        ]
        
        # User input extension ID
        self.extension_id = tk.StringVar()
    
    def check_update(self):
        """Check if this is an update installation"""
        # Check if C:\ec-chrome-extension\native-host\com.realvnc.vncviewer.json exists
        native_host_path = os.path.join(self.install_path, "native-host", "com.realvnc.vncviewer.json")
        return os.path.exists(native_host_path)
        
    def animate_progress_to(self, target_value, duration=1000):
        """Simulate animation effect, move progress bar to specified value"""
        
        # Set progress bar to determinate mode
        self.progress['mode'] = 'determinate'
        self.progress['maximum'] = 100
        
        # Get current value
        current_value = self.progress['value'] if self.progress['value'] else 0

        while current_value < target_value:
            current_value += 1
            self.progress['value'] = current_value
            self.root.update()
            time.sleep(0.01)
        


    def set_window_icon(self):
        """Set window icon - load icon from packaged resources or development environment"""
        
        # Method 1: Load icon from resources in packaged environment
        if hasattr(sys, '_MEIPASS'):
            try:
                base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
                # Try to load icon from packaged resources
                icon_paths = [
                    os.path.join(base_path, "icon", "multi_size.ico"),  # Packaged icon directory
                ]
                
                for icon_path in icon_paths:
                    if os.path.exists(icon_path):
                        self.root.iconbitmap(icon_path)
                        print(f"✅ Window icon set successfully (packaged environment): {icon_path}")
                        return
            except Exception as e:
                print(f"⚠️  Packaged environment icon loading failed: {e}")
        
        # Method 2: Load icon from local files in development environment
        try:
            # Try to use project icon files
            icon_paths = [
                "icon/48.ico",           # Multi-size icon directory
                "icon/32.ico", 
                "icon.ico",              # Root directory icon
                "../public/icon/48.ico"  # Project public icon
            ]
            
            for icon_path in icon_paths:
                if os.path.exists(icon_path):
                    self.root.iconbitmap(icon_path)
                    print(f"✅ Window icon set successfully (development environment): {icon_path}")
                    return
        except Exception as e:
            print(f"⚠️  Development environment icon loading failed: {e}")
        
        # Method 3: If all methods fail, use PhotoImage to load PNG (fallback option)
        try:
            # Try to load PNG format icon
            if hasattr(sys, '_MEIPASS'):
                base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
                png_path = os.path.join(base_path, "public", "icon", "48.png")
            else:
                png_path = "../public/icon/48.png"
            
            if os.path.exists(png_path):
                from tkinter import PhotoImage
                icon_image = PhotoImage(file=png_path)
                self.root.iconphoto(True, icon_image)
                print(f"✅ Window icon set successfully (PNG fallback): {png_path}")
                return
        except Exception as e:
            print(f"⚠️  PNG icon loading failed: {e}")
        
        print("⚠️  Window icon setting failed, will use default Python icon")

    
    def extract_files(self):
        """Extract files from exe resources to installation directory"""
        try:
            # Create installation directory
            install_path = Path(self.install_path)
            
            # Check if running in packaged mode
            if getattr(sys, 'frozen', False):
                # Packaged exe file - extract files from resources
                base_path = sys._MEIPASS if hasattr(sys, '_MEIPASS') else Path(sys.executable).parent
                
                # Check if dist directory exists in resources
                dist_source_path = Path(base_path) / "dist"
                if not dist_source_path.exists():
                    messagebox.showerror("Error", "Installer resource files are corrupted, dist directory does not exist")
                    return False
                
                # Clean target directory
                if install_path.exists():
                    shutil.rmtree(install_path)
                
                # Copy all files
                shutil.copytree(dist_source_path, install_path)
            else:
                # Development mode - check dist in current directory
                dist_path = Path("../dist")
                if not dist_path.exists():
                    messagebox.showerror("Error", "dist directory does not exist, please build the project first")
                    return False
                
                # Clean target directory
                if install_path.exists():
                    shutil.rmtree(install_path)
                
                # Copy all files
                shutil.copytree(dist_path, install_path)
            
            return True
            
        except Exception as e:
            messagebox.showerror("Error", f"File extraction failed: {str(e)}")
            return False
    
    def setup_registry(self):
        """Set up registry entries"""
        try:
            # Chrome native messaging registry entry
            registry_path = r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.realvnc.vncviewer"
            
            # Create or update registry entry
            with winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, registry_path) as key:
                manifest_path = os.path.join(self.install_path, "native-host", "com.realvnc.vncviewer.json")
                winreg.SetValueEx(key, "", 0, winreg.REG_SZ, manifest_path)
            
            # Record installation information
            install_info_path = r"SOFTWARE\ECChromeExtension"
            with winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, install_info_path) as key:
                winreg.SetValueEx(key, "InstallPath", 0, winreg.REG_SZ, self.install_path)
                winreg.SetValueEx(key, "Version", 0, winreg.REG_SZ, "1.0.0")
            
            return True
            
        except Exception as e:
            messagebox.showerror("Error", f"Registry setup failed: {str(e)}")
            return False
    
    def step_welcome(self):
        """Welcome page"""
        self.clear_content()
        self.title_label.config(text="Welcome to Chrome Browser Extension Installer")
        
        # Welcome text
        welcome_text = """
This installer will help you install the Chrome browser extension.

Clicking "Start Installation" will install the program to:

C:\ec-chrome-extension
⚠️ If the directory already exists, it will be cleaned up
        """
        
        text_widget = tk.Text(self.content_frame, wrap=tk.WORD, height=10, font=("Arial", 11))
        text_widget.insert(tk.END, welcome_text)
        text_widget.config(state=tk.DISABLED)
        text_widget.pack(fill=tk.BOTH, expand=True)
        
        # Buttons
        self.create_buttons(prev=False, next_text="Start Installation")

    
    def step_install_files(self):
        """File installation step"""
        self.clear_content()
        self.title_label.config(text="File Installation")
        
        # Buttons (next button initially disabled)
        self.create_buttons(prev=False, next_enabled=False)
        
        print(f"Installation path: {self.install_path}, Update mode: {self.is_update}")

        # Installation information
        mode_text = "Update mode" if self.is_update else "Fresh installation"
        info_text = f"""
Installation mode: {mode_text}
Installation path: {self.install_path}

Installation content:
• Chrome browser extension file installation
• VNC Viewer registry configuration
        """
        
        text_widget = tk.Text(self.content_frame, wrap=tk.WORD, height=8, font=("Arial", 10))
        text_widget.insert(tk.END, info_text)
        text_widget.config(state=tk.DISABLED)
        text_widget.pack(fill=tk.BOTH, expand=True)
        
        
        config_path = os.path.join(self.install_path, "native-host", "com.realvnc.vncviewer.json")

        json_content = ''

        # Determine if it's an update or fresh installation
        if self.is_update:
            # If it's an update, read the json file content
            with open(config_path, "r") as f:
                json_content = f.read()
                print(f"JSON content read: {json_content}")



        print("Starting fresh installation...")

        # Extract files
        self.status_label.config(text="Installing files...")
        if self.extract_files():
            self.status_label.config(text="File installation completed!")
            
            self.animate_progress_to(25 if self.is_update else 10)

            # Configure registry
            if self.setup_registry():
                self.status_label.config(text="Registry configuration completed!")
                
                self.animate_progress_to(50 if self.is_update else 20)

                # If it's an update installation, write json content back to file
                if self.is_update and json_content:
                    with open(config_path, "w") as f:
                        f.write(json_content)
                else:
                    # Fresh installation, preserve original json content
                    try:
                        # Check if configuration file exists
                        if not os.path.exists(config_path):
                            print(f"❌ Configuration file does not exist: {config_path}")
                            return False
                        
                        # Read configuration file
                        with open(config_path, 'r', encoding='utf-8') as f:
                            self.vnc_json_con = f.read()
                            print(f"JSON content read: {self.vnc_json_con}")
                    except Exception as e:
                        messagebox.showerror("Error", f"Failed to read configuration file: {str(e)}")
                
                # Enable next button
                self.next_button.config(state=tk.NORMAL)
            else:
                self.status_label.config(text="Registry configuration failed!")
        else:
            self.status_label.config(text="File installation failed!")


        
     
    
    def create_guide_step(self, title, instructions, image_path=None):
        """Create a generic guide step (with scrollbar and optimized layout)"""
        self.clear_content()
        self.title_label.config(text=title)
        
        # Create main container frame
        main_frame = ttk.Frame(self.content_frame)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Create scrollbar frame
        scroll_frame = ttk.Frame(main_frame)
        scroll_frame.pack(fill=tk.BOTH, expand=True)
        
        # Create canvas and scrollbar
        canvas = tk.Canvas(scroll_frame, bg='white')
        scrollbar = ttk.Scrollbar(scroll_frame, orient=tk.VERTICAL, command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Layout scroll area
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Bind mouse wheel event
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # Instruction text
        text_widget = tk.Text(scrollable_frame, wrap=tk.WORD, height=8, font=("Arial", 11))
        text_widget.insert(tk.END, instructions)
        text_widget.config(state=tk.DISABLED)
        text_widget.pack(fill=tk.X, pady=(0, 10))
        
        # Image (if available)
        if image_path:
            # Handle packaged resource paths
            if hasattr(sys, '_MEIPASS'):
                # Packaged exe environment
                base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
                # Try to find image in setp directory
                step_image_path = os.path.join(base_path, "setp", os.path.basename(image_path))
                if os.path.exists(step_image_path):
                    image_path = step_image_path
                else:
                    # If setp directory doesn't exist, try direct path
                    image_path = os.path.join(base_path, os.path.basename(image_path))
            else:
                # Development environment: use images from setp directory
                step_image_path = os.path.join("setp", os.path.basename(image_path))
                if os.path.exists(step_image_path):
                    image_path = step_image_path
            
            if os.path.exists(image_path):
                try:
                    # Use PIL library to load and resize image
                    pil_image = Image.open(image_path)
                    width, height = pil_image.size
                    
                    # Calculate scaling ratio (100% width, adaptive height)
                    max_width = 722  # Maximum width limit (considering scrollbar and margins)
                    if width > max_width:
                        scale_factor = max_width / width
                        new_width = max_width
                        new_height = int(height * scale_factor)
                    else:
                        new_width = width
                        new_height = height
                    
                    # Use PIL library for precise scaling (compatible with older versions)
                    pil_image = Image.open(image_path)
                    # Use compatible scaling method
                    try:
                        # New version PIL
                        resized_pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    except AttributeError:
                        # Old version PIL
                        resized_pil_image = pil_image.resize((new_width, new_height), Image.LANCZOS)
                    resized_image = ImageTk.PhotoImage(resized_pil_image)
                    
                    # Create image container frame, ensure width control
                    image_container = ttk.Frame(scrollable_frame)
                    image_container.pack(fill=tk.X, pady=(0, 0))
                    
                    # Display image (centered, width limited)
                    image_label = ttk.Label(image_container, image=resized_image)
                    image_label.image = resized_image  # Keep reference
                    image_label.pack(anchor=tk.CENTER)  # Center display
                    
                    # Force set container maximum width
                    image_container.configure(width=new_width)
                    
                    print(f"✅ Image loaded successfully: {os.path.basename(image_path)} Original size: {width}x{height} -> Scaled: {new_width}x{new_height}")
                    
                except Exception as e:
                    print(f"❌ Image loading failed: {e}")
                    # Display error message when image loading fails
                    error_label = ttk.Label(scrollable_frame, text=f"Image loading failed: {os.path.basename(image_path)}", 
                                           foreground="red")
                    error_label.pack(pady=10)
        
        # Update canvas scroll region
        canvas.update_idletasks()
        canvas.configure(scrollregion=canvas.bbox("all"))
    
    def step_guide_developer_mode(self):
        """Developer mode guide"""
        
        self.animate_progress_to(40)
        self.status_label.config(text="")
        instructions = """
Enable Chrome Developer Mode

1. Open Chrome browser
2. Type in address bar: chrome://extensions/
3. Find the "Developer mode" switch in the top right corner
4. Click to enable developer mode

After enabling, you will see the "Load unpacked" button.
        """
        # Use guide images from setp directory
        self.create_guide_step("Enable Developer Mode", instructions, "1.png")
        self.create_buttons()
    
    def step_guide_load_extension(self):
        """Load extension guide"""
        self.animate_progress_to(60)
        instructions = f"""
Load Browser Extension

1. Click the "Load unpacked" button
2. Select folder: {self.install_path}
3. Click the "Select Folder" button

The extension will be loaded into the browser, you should now see the extension icon.
        """
        # Use guide images from setp directory
        self.create_guide_step("Load Extension", instructions, "2.png")
        self.create_buttons()
    
    def step_guide_copy_id(self):
        """Copy extension ID guide"""
        self.animate_progress_to(80)
        instructions = """
Copy Extension ID

1. Find the extension you just installed in the extensions management page
2. Find the "ID" field and copy the ID
3. Click "Next" to enter this ID

This ID is required for configuring native messaging.
        """
        # Image path will be processed in create_guide_step
        self.create_guide_step("Copy Extension ID", instructions, "3.png")
        self.create_buttons()
    
    def step_guide_enter_id(self):
        """Enter extension ID step"""
        self.animate_progress_to(95)
        self.clear_content()
        self.title_label.config(text="Enter Extension ID")
        
        instructions = """
Please paste the extension ID copied in the previous step into the input box below:
        """
        
        text_widget = tk.Text(self.content_frame, wrap=tk.WORD, height=3, font=("Arial", 11))
        text_widget.insert(tk.END, instructions)
        text_widget.config(state=tk.DISABLED)
        text_widget.pack(fill=tk.X, pady=10)
        
        # Input box
        entry_frame = ttk.Frame(self.content_frame)
        entry_frame.pack(fill=tk.X, pady=10)
        
        ttk.Label(entry_frame, text="Extension ID:").pack(side=tk.LEFT)
        entry = ttk.Entry(entry_frame, textvariable=self.extension_id, width=40)
        entry.pack(side=tk.LEFT, padx=10)
        
        # Simple function to validate ID format
        def validate_id():
            id_text = self.extension_id.get().strip()
            if len(id_text) > 10:  # Simple length validation
                self.next_button.config(state=tk.NORMAL)
            else:
                self.next_button.config(state=tk.DISABLED)
        
        self.extension_id.trace('w', lambda *args: validate_id())
        
        self.create_buttons(next_enabled=False)
    
    def step_guide_refresh(self):
        """Refresh extension guide"""
        if self.is_update:

            instructions = """
Refresh Extension

1. Return to the extensions management page (chrome://extensions/)
2. Find your extension
3. Click the refresh icon on the extension card
4. Make sure the extension is enabled

If you encounter any issues, please refer to the installation guide or contact technical support.
            """
            # Use guide images from setp directory
            self.create_guide_step("Refresh Extension", instructions, "4.png")
            
            update_note = """
Note: Since this is an update installation, you need to refresh the extension for the changes to take effect.
            """
            note_label = ttk.Label(self.content_frame, text=update_note, foreground="blue")
            note_label.pack(pady=10)
            # Create buttons - add reinstall button in update mode
            self.create_buttons_with_reinstall(prev=False, next_text="Finish")
        
        else:

            instructions = """
Apply Extension

1. Return to the extensions management page (chrome://extensions/)
2. Find your extension
3. Make sure the extension is enabled
4. Restart the browser to ensure the extension takes effect

If you encounter any issues, please refer to the installation guide or contact technical support.
            """
            # Use guide images from setp directory
            self.create_guide_step("Apply Extension", instructions, "5.png")
            self.create_buttons(prev=False, next_text="Finish")
    

    def clear_content(self):
        """Clear content area"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def create_buttons_with_reinstall(self, prev=True, next_text="Finish", next_enabled=True):
        """Create navigation buttons with reinstall button (used in update mode)"""
        # Clear button area
        for widget in self.button_frame.winfo_children():
            widget.destroy()
        
        # Previous button
        if prev:
            self.prev_button = ttk.Button(self.button_frame, text="Previous", command=self.prev_step)
            self.prev_button.pack(side=tk.LEFT)
        
        # Reinstall button (centered)
        self.reinstall_button = ttk.Button(self.button_frame, text="Reinstall", 
                                          command=self.reinstall_extension)
        self.reinstall_button.pack(side=tk.LEFT, padx=10)
        

        # Next button
        self.next_button = tk.Button(self.button_frame, text=next_text, command=self.next_step, 
                                    state=tk.NORMAL if next_enabled else tk.DISABLED,
                                    bg="#0078D7", fg="white",
                                    padx=20, bd=0, highlightthickness=0,
                                    relief="flat", cursor="hand2")
        self.next_button.pack(side=tk.RIGHT)

    def create_buttons(self, prev=True, next_text="Next", next_enabled=True):
        """Create navigation buttons"""
        # Clear button area
        for widget in self.button_frame.winfo_children():
            widget.destroy()
        
        # Previous button
        if prev:
            self.prev_button = ttk.Button(self.button_frame, text="Previous", command=self.prev_step)
            self.prev_button.pack(side=tk.LEFT)
        
        # Next button (highlighted)
        self.next_button = tk.Button(self.button_frame, text=next_text, command=self.next_step, 
                                    state=tk.NORMAL if next_enabled else tk.DISABLED,
                                    bg="#0078D7", fg="white", font=("Arial", 10, "bold"),
                                    padx=20, pady=8, bd=0, highlightthickness=0,
                                    relief="flat", cursor="hand2")
        self.next_button.pack(side=tk.RIGHT)
    
    def replace_extension_id_in_config(self, extension_id):
        """Replace extension ID in configuration file"""
        config_path = os.path.join(self.install_path, "native-host", "com.realvnc.vncviewer.json")
        
        try:
            
            # Replace extension ID
            content = self.vnc_json_con.replace("${EXTENSION_ID}", extension_id)
            
            # Check if replacement was made
            if content == self.vnc_json_con:
                print("⚠️  ${EXTENSION_ID} placeholder not found in configuration file")
                return False
            
            # Write modified content
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Extension ID replacement successful: {extension_id}")
            print(f"✅ Configuration file updated: {config_path}")
            return True
            
        except Exception as e:
            print(f"❌ Extension ID replacement failed: {e}")
            return False

    def reinstall_extension(self):
        """Reinstall extension (you can improve this method later)"""
        print("Reinstall button clicked")
        self.current_step = 0
        self.is_update = False
        self.steps[self.current_step]()
        self.progress['value'] = 0
        
    def next_step(self):
        """Next step"""
        # If it's step 4 (enter extension ID), perform replacement operation first
        print(f'Step: {self.current_step}')
        if self.current_step == 5:  # Step 6 index is 5
            extension_id = self.extension_id.get().strip()
            if extension_id:
                print(f"Processing extension ID: {extension_id}")
                if not self.replace_extension_id_in_config(extension_id):
                    # If replacement fails, show error message and stay on current step
                    messagebox.showerror("Error", "Extension ID replacement failed, please check if configuration file exists")
                    return
                print("✅ Extension ID processing completed, continuing to next step")
        elif self.is_update and self.current_step == 1:
            self.current_step = 6
            self.steps[self.current_step]()
            self.animate_progress_to(95)
            return
        
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.steps[self.current_step]()
        else:
            self.root.quit()
    
    def prev_step(self):
        """Previous step"""
        if self.current_step > 0:
            self.current_step -= 1
            self.steps[self.current_step]()
    
    def run(self):
        """Run the application"""
        # Start the first step
        self.steps[self.current_step]()
        
        # Run the main loop
        self.root.mainloop()


def is_admin():
    """Check if currently running with administrator privileges"""
    try:
        # Windows system check for administrator privileges
        if platform.system() == "Windows":
            return ctypes.windll.shell32.IsUserAnAdmin()
        # Other systems temporarily return True (such as Linux/macOS)
        return True
    except:
        return False


def show_admin_warning():
    """Display administrator privileges warning popup"""
    root = tk.Tk()
    root.withdraw()  # Hide main window
    
    warning_msg = """Please run as administrator"""
    
    messagebox.showwarning(
        "Insufficient permissions",
        warning_msg,
        icon=messagebox.WARNING
    )
    
    root.destroy()
    return False  # Force exit program


def main():
    # Only check Python version in development environment (not needed after packaging)
    if not hasattr(sys, '_MEIPASS') and sys.version_info < (3, 6):
        print("Python 3.6 or higher required")
        print("Please use 'python build.py' to build exe file, or upgrade Python version")
        return
    
    # Check administrator privileges (Windows system only)
    if platform.system() == "Windows" and not is_admin():
        print("⚠️  Detected non-administrator privileges running")
        show_admin_warning()  # Show warning and force exit
        print("Program exited due to insufficient permissions")
        return
    
    # Create and run installer
    app = InstallerApp()
    app.run()

if __name__ == "__main__":
    main()
