# API 接口模块说明

## 目录功能概述

`api/` 目录包含了浏览器扩展与后端服务通信的所有 API 接口定义，提供统一的 HTTP 请求封装和错误处理机制。

## 文件说明

### 🔐 auth.ts
**认证授权 API**

**功能描述：**
- 处理用户登录、注册、注销等认证相关操作
- 管理用户会话和令牌刷新
- 提供权限验证功能

**主要接口：**
- `login(username, password)` - 用户登录
- `logout()` - 用户注销
- `refreshToken()` - 刷新访问令牌
- `checkAuth()` - 检查认证状态

**使用示例：**
```typescript
import { login } from '../api/auth';

// 用户登录
const result = await login('username', 'password');
if (result.success) {
    console.log('登录成功');
}
```

### 🖥️ host.ts
**主机管理 API**

**功能描述：**
- 管理 VNC 主机信息的增删改查操作
- 处理主机连接状态监控
- 提供主机分组和搜索功能

**主要接口：**
- `getHostList()` - 获取主机列表
- `addHost(hostInfo)` - 添加主机
- `updateHost(id, hostInfo)` - 更新主机信息
- `deleteHost(id)` - 删除主机
- `connectHost(hostInfo)` - 连接主机

**使用示例：**
```typescript
import { getHostList, connectHost } from '../api/host';

// 获取主机列表
const hosts = await getHostList();

// 连接主机
await connectHost({
    host: '192.168.1.100',
    port: 5900,
    username: 'admin',
    password: 'password'
});
```

## API 设计原则

1. **统一错误处理**：所有 API 调用都包含标准的错误处理机制
2. **类型安全**：使用 TypeScript 接口定义请求和响应类型
3. **异步处理**：所有 API 都返回 Promise，支持 async/await
4. **请求拦截**：支持请求拦截器，用于添加认证头等信息

## 依赖关系

- 依赖于 `utils/http.ts` 提供的 HTTP 请求封装
- 与 `entity/main.ts` 中的数据类型定义配合使用
- 被 `components/` 目录中的 Vue 组件调用

## 扩展建议

1. 可以添加 API 缓存机制，减少重复请求
2. 支持请求重试机制，提高网络稳定性
3. 添加 API 调用统计和监控功能