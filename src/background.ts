import browser from "webextension-polyfill";
const NATIVE_HOST_NAME = 'com.realvnc.vncviewer';

console.log("Hello from the background!");

browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details);
});

// 处理跨域请求
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'apiRequest') {
    console.log('收到跨域请求:', request.url, request.method, request.body, request.credentials);
    
    const fetchOptions: any = {
      method: request.method || 'GET',
      headers: request.headers || {},
      credentials: request.credentials
    };
    
    // 如果是POST/PUT/PATCH请求且有body数据，则添加body
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      fetchOptions.body = request.body;
    }
    
    console.log('发送fetch请求:', request.url, fetchOptions);
    
    fetch(request.url, fetchOptions)
    .then(response => {
      console.log('收到响应状态:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('请求成功:', data);
      // @ts-ignore
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('请求失败:', error);
      // @ts-ignore
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // 保持消息通道开放，用于异步响应
  }else if(request.type === 'vncConnect'){
    /**
     * 接收参数：
     * @param {Object} request - 包含hostInfo的请求对象
     * @param {Object} request.hostInfo - VNC连接信息
     * @param {string} request.hostInfo.host - VNC服务器主机名或IP地址
     * @param {number} request.hostInfo.port - VNC服务器端口号
     * @param {string} request.hostInfo.username - VNC用户名
     * @param {string} request.hostInfo.password - VNC密码
     * @param {string} request.hostInfo.displayName - 连接显示名称
     * @param {string} request.hostInfo.encryption - 加密类型（如TLS）
     * @param {string} request.hostInfo.quality - 图像质量（如High）
     * @param {string} request.hostInfo.scaling - 缩放模式（如Auto）
     */

    console.log('收到vncConnect请求:', request);
    
    // 生成SVN文件
    const svnContent = generateSVNFile(request.hostInfo || {});
    // 使用临时目录生成SVN文件，避免硬编码路径
    const svnFilePath = generateTempSVNFilePath();
    
    // 调用RealVNC
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
    
    console.log('收到vncConnect请求:', port);
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
    
    // Send launch command to native host
    port.postMessage({
      action: 'launch',
      connectionFile: connectionFile,
      svnContent: svnContent
    });
  });
}

// 生成SVN文件内容
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

// 生成临时SVN文件路径
function generateTempSVNFilePath(): string {
  // 使用时间戳和随机数确保文件唯一性
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const filename = `vnc_connection_${timestamp}_${random}.svn`;
  
  // 最佳方案：使用相对路径，让Python脚本处理路径解析
  // Python脚本会在其所在目录创建temp文件夹
  return `temp\\${filename}`;
}
