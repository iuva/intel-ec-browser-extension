# CPU Test Browser Extension - 项目结构说明

本文档描述 `src` 目录下直属目录和文件的功能说明。

## 目录结构概览

```
src/
├── api/                    # API接口模块
├── background.ts           # 后台服务脚本
├── components/             # Vue组件目录
├── content.ts             # 内容脚本
├── entity/                # 实体类型定义
├── img/                   # 图片资源
├── manifest.json          # 浏览器插件清单
├── pages/                 # 页面组件
├── popup.html             # 弹窗页面HTML
├── popup.ts               # 弹窗页面脚本
├── utils/                 # 工具函数
└── vite-env.d.ts          # Vite类型定义
```

## 文件功能详细说明

### 📁 api/ - API接口模块
- **auth.ts**: 用户认证相关API接口
- **host.ts**: 主机管理相关API接口

### 📄 background.ts - 后台服务脚本
- 浏览器插件的后台服务，处理跨域请求和VNC连接
- 主要功能：
  - 处理跨域API请求代理
  - 管理RealVNC连接功能
  - 生成SVN配置文件
  - 与原生主机通信

### 📁 components/ - Vue组件目录
- **main.vue**: 主组件，实现可拖拽的悬浮窗口
- **hostList.vue**: 主机列表组件，显示可连接的主机

### 📄 content.ts - 内容脚本
- 注入到目标网页的脚本
- 主要功能：
  - 在页面中创建并挂载Vue应用
  - 监听页面变化和单选框状态
  - 实现TC模式下的内容抓取功能

### 📁 entity/ - 实体类型定义
- **main.ts**: 定义主组件相关的TypeScript类型接口

### 📁 img/ - 图片资源
- **loading.png**: 加载中图标
- **search.png**: 搜索图标

### 📄 manifest.json - 浏览器插件清单
- 定义插件的配置信息
- 包括权限、内容脚本匹配规则、图标等

### 📁 pages/ - 页面组件
- **Popup.vue**: 浏览器工具栏弹窗页面

### 📄 popup.html - 弹窗页面HTML
- 弹窗页面的HTML结构

### 📄 popup.ts - 弹窗页面脚本
- 弹窗页面的JavaScript逻辑

### 📁 utils/ - 工具函数
- **http.ts**: HTTP请求封装工具
- **notification.ts**: 通知功能工具

### 📄 vite-env.d.ts - Vite类型定义
- Vite构建工具的类型定义文件

## 主要功能特性

### 1. 悬浮窗口功能
- 可拖拽的悬浮窗口，支持边缘吸附
- 根据鼠标焦点自动显示/隐藏
- 支持不同状态（蓝色正常、红色警告）

### 2. TC模式内容抓取
- 当进入TC模式页面时自动激活
- 监听页面单选框变化
- 每200毫秒抓取`.record-hierarchy-container`内容
- 支持三种结束条件判断

### 3. VNC连接功能
- 集成RealVNC客户端
- 支持原生主机通信
- 自动生成SVN配置文件

### 4. 跨浏览器兼容
- 支持Chrome、Firefox、Edge等浏览器
- 使用`webextension-polyfill`确保兼容性

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **浏览器扩展**: WebExtensions API
- **样式**: Less CSS
- **包管理**: pnpm

## 开发说明

项目使用vite-plugin-web-extension进行开发，确保跨浏览器兼容性。所有测试相关的脚本和文件都应放入`tests`目录中。