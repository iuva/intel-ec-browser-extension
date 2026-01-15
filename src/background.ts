import browser from "webextension-polyfill";
const NATIVE_HOST_NAME = 'com.realvnc.vncviewer';

console.log("Hello from the background!");

browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details);
});

// Handle cross-origin requests
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'apiRequest') {
    console.log('Received cross-origin request:', request.url, request.method, request.body, request.credentials);
    
    const fetchOptions: any = {
      method: request.method || 'GET',
      headers: request.headers || {},
      credentials: request.credentials
    };
    
    // If it's a POST/PUT/PATCH request and has body data, add body
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      fetchOptions.body = request.body;
    }
    
    console.log('Sending fetch request:', request.url, fetchOptions);
    
    fetch(request.url, fetchOptions)
    .then(response => {
      console.log('Received response status:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Request successful:', data);
      // @ts-ignore
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('Request failed:', error);
      // @ts-ignore
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep message channel open for async response
  }else if(request.type === 'vncConnect'){
    /**
     * Parameters received:
     * @param {Object} request - Request object containing hostInfo
     * @param {Object} request.hostInfo - VNC connection information
     * @param {string} request.hostInfo.host - VNC server hostname or IP address
     * @param {number} request.hostInfo.port - VNC server port number
     * @param {string} request.hostInfo.username - VNC username
     * @param {string} request.hostInfo.password - VNC password
     * @param {string} request.hostInfo.displayName - Connection display name
     * @param {string} request.hostInfo.encryption - Encryption type (e.g., TLS)
     * @param {string} request.hostInfo.quality - Image quality (e.g., High)
     * @param {string} request.hostInfo.scaling - Scaling mode (e.g., Auto)
     */

    console.log('Received vncConnect request:', request);
    
    // Generate SVN file
    const svnContent = generateSVNFile(request.hostInfo || {});
    // Use temporary directory to generate SVN file, avoid hardcoded paths
    const svnFilePath = generateTempSVNFilePath();
    
    // Call RealVNC
    launchRealVNC(svnFilePath, svnContent)
    // @ts-ignore
      .then(result => { sendResponse({ success: true, result }) } )
    // @ts-ignore
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

// Function to launch RealVNC through native messaging
async function launchRealVNC(connectionFile = '', svnContent = '') {
  return new Promise((resolve, reject) => {
    const port = browser.runtime.connectNative(NATIVE_HOST_NAME);
    
    port.onMessage.addListener((response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Failed to launch RealVNC'));
      }
      port.disconnect();
    });
    
    port.onDisconnect.addListener(() => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
      }
    });
    
    console.log('Received vncConnect request:', connectionFile, svnContent);
    // Send launch command to native host
    port.postMessage({
      action: 'launch',
      connectionFile: connectionFile,
      svnContent: svnContent
    });
  });
}

// Generate SVN file content
function generateSVNFile(hostInfo: any): string {
  const {
    host = 'localhost',
    port = 5900,
    username = '',
    password = '',
    displayName = 'VNC Connection',
    encryption = 'TLS',
    quality = 'High',
    scaling = 'Auto'
  } = hostInfo;
  
  const svnContent = `[connection]
host=${host}
port=${port}
username=${username}
password=${password}
encryption=${encryption}
quality=${quality}
scaling=${scaling}

[options]
display_name=${displayName}
auto_scale=true
full_screen=false
view_only=false
shared=true

[security]
verify_certificates=true
allow_unsupported_encodings=false`;
  
  return svnContent;
}

// Generate temporary SVN file path
function generateTempSVNFilePath(): string {
  // Use timestamp and random number to ensure file uniqueness
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const filename = `vnc_connection_${timestamp}_${random}.svn`;
  
  // Best solution: use relative path, let Python script handle path resolution
  // Python script will create temp folder in its own directory
  return `temp\\${filename}`;
}
