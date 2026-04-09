<script lang="ts" setup>
import browser from "webextension-polyfill";

console.log("Hello from the popup!");
const appVersion = import.meta.env.VITE_APP_VERSION;

// 测试VNC连接
const testVncConnection = () => {
  console.log('Testing VNC connection...')
  
  // 发送消息到background script
  if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.sendMessage({
      type: 'vncConnect',
      hostInfo: {
        host: 'localhost',
        port: 5900,
        name: 'Test Host',
        timestamp: new Date().toISOString()
      }
    }).then(response => {
      console.log('VNC connection test response:', response)
    }).catch(error => {
      console.error('VNC connection test failed:', error)
    })
  } else {
    console.error('Browser runtime API not available')
  }
}
</script>

<template>
  <div class="popup-main" >
    <p>
      Current Version: {{ appVersion }}
    </p>
    
    <!-- 右键菜单 -->
    <div 
      class="context-menu"
      @click.stop
    >
      <div class="menu-item" @click="testVncConnection">
        🔗 测试VNC连接
      </div>
    </div>
  </div>
</template>

<style>

body {
  width: 200px;
  height: auto;
  padding: 30px 10px;
  margin: 0;
  border-radius: 5px;
  background-color: rgb(36, 36, 36);
}


body .popup-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
}

img {
  width: 200px;
  height: 200px;
}

h1 {
  font-size: 18px;
  color: white;
  font-weight: bold;
  margin: 0;
}

p {
  color: white;
  opacity: 0.7;
  margin: 0;
}

code {
  font-size: 12px;
  padding: 2px 4px;
  background-color: #ffffff24;
  border-radius: 2px;
}

/* 右键菜单样式 */
.context-menu {
  background: #0f0f0f; /* 更深的背景色，与父元素形成鲜明对比 */
  border: 2px solid #888; /* 更粗更亮的边框 */
  border-radius: 8px;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.6), /* 主阴影 */
    0 0 0 1px rgba(255, 255, 255, 0.1); /* 内发光效果 */
  z-index: 2147483647; /* 最大z-index确保在最顶层 */
  min-width: 160px;
  backdrop-filter: blur(10px); /* 毛玻璃效果增强视觉层次 */
  margin-top: 10px;
}

.menu-item {
  padding: 10px 14px;
  color: #f0f0f0; /* 更亮的文字颜色 */
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background-color: #2a2a2a; /* 更明显的悬停效果 */
  color: #ffffff;
  transform: translateX(2px); /* 微妙的动画效果 */
}

.menu-item:active {
  background-color: #3a3a3a;
  transform: translateX(0);
}

/* 确保右键菜单完全脱离父元素约束 */
.context-menu {
  transform: translateZ(0); /* 强制硬件加速 */
  will-change: transform; /* 优化性能 */
}

/* 为菜单添加更明显的视觉分隔和发光效果 */
.context-menu::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  background: linear-gradient(135deg, 
    rgba(100, 100, 100, 0.4) 0%, 
    rgba(50, 50, 50, 0.2) 50%, 
    rgba(100, 100, 100, 0.4) 100%);
  border-radius: 11px;
  z-index: -1;
  opacity: 0.6;
  filter: blur(1px);
}

/* 确保父元素不会限制菜单显示 */
body > div {
  position: static !important; /* 移除相对定位 */
  overflow: visible !important;
}
</style>
