# CPU Test Browser Extension

一个用于在浏览器中便捷查看和打开VNC连接的浏览器插件。

## 🚀 项目简介

这是一个基于Vue 3 + TypeScript开发的浏览器扩展，专门用于在Intel HSDES系统中提供VNC连接管理功能。插件采用可拖拽的悬浮窗口设计，支持跨浏览器运行。

## ✨ 核心功能

### 🔍 智能页面检测
- 自动检测HSDES系统页面
- 智能识别TC模式（Test Case）
- 监听页面单选框变化

### 🖱️ 悬浮窗口操作
- 可拖拽的悬浮按钮
- 边缘吸附功能
- 鼠标焦点自动显示/隐藏
- 支持多种状态显示（正常/警告）

### 🔗 VNC连接管理
- 集成RealVNC客户端
- 自动生成SVN配置文件
- 支持原生主机通信
- 连接失败重试机制

### 📊 TC模式内容抓取
- 监听页面单选框变化
- 200ms间隔抓取页面内容
- 智能结束条件判断

## 🌐 浏览器支持

- ✅ Chrome
- ✅ Firefox  
- ✅ Edge
- ✅ 其他基于Chromium的浏览器

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **浏览器扩展**: WebExtensions API
- **样式**: Less CSS
- **包管理**: pnpm

## 📁 项目结构

```
src/
├── components/     # Vue组件
├── api/           # API接口
├── background.ts   # 后台服务
├── content.ts     # 内容脚本
├── manifest.json  # 插件配置
└── utils/         # 工具函数
```

详细的项目结构说明请查看 [src/README.md](src/README.md)

## 🚦 快速开始

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm dev
```

### 构建插件
```bash
pnpm build
```

## 🔧 配置说明

### 环境配置
- `.env.chrome`: Chrome环境配置
- `.env.firefox`: Firefox环境配置

### 原生主机配置
- `native-host/`: RealVNC原生主机配置
- 需要注册到系统才能使用VNC功能

## 📋 使用场景

1. **HSDES系统访问**: 在Intel HSDES系统中自动激活插件
2. **TC模式识别**: 进入测试用例页面时自动检测
3. **VNC连接**: 选择主机后一键连接VNC
4. **状态监控**: 实时显示连接状态和待恢复连接

## 🔒 安全特性

- 用户信息自动获取和鉴权
- 跨域请求通过后台服务代理
- VNC密码加密传输
- 原生主机安全通信

---

**注意**: 本项目专为Intel HSDES系统设计，在其他环境中可能无法正常工作。