# 数据实体模块说明

## 目录功能概述

`entity/` 目录定义了浏览器扩展中使用的所有 TypeScript 接口和数据类型，提供统一的数据模型定义，确保类型安全。

## 文件说明

### 📊 main.ts
**主数据实体定义**

**功能描述：**
- 定义扩展中使用的所有核心数据类型
- 提供统一的接口规范
- 确保前后端数据格式一致性

**主要数据类型：**

#### Host 接口 - 主机信息
```typescript
interface Host {
  id: string;           // 主机唯一标识
  name: string;         // 主机名称
  host: string;         // 主机地址或IP
  port: number;         // 端口号
  username?: string;    // 用户名（可选）
  password?: string;    // 密码（可选）
  group?: string;       // 分组名称
  status: 'online' | 'offline' | 'connecting'; // 连接状态
  lastConnected?: Date; // 最后连接时间
}
```

#### User 接口 - 用户信息
```typescript
interface User {
  id: string;           // 用户ID
  username: string;     // 用户名
  email: string;        // 邮箱
  role: 'admin' | 'user'; // 用户角色
  createdAt: Date;      // 创建时间
}
```

#### ApiResponse 接口 - API 响应格式
```typescript
interface ApiResponse<T = any> {
  success: boolean;     // 请求是否成功
  data?: T;            // 响应数据
  message?: string;     // 消息提示
  code?: number;        // 状态码
}
```

#### ConnectionConfig 接口 - 连接配置
```typescript
interface ConnectionConfig {
  encryption: 'TLS' | 'None';    // 加密方式
  quality: 'High' | 'Medium' | 'Low'; // 图像质量
  scaling: 'Auto' | '100%' | 'Fit';   // 缩放模式
  viewOnly: boolean;             // 只读模式
  shared: boolean;               // 共享连接
}
```

## 类型设计原则

1. **完整性**：覆盖所有业务场景的数据类型
2. **可扩展性**：接口设计支持未来功能扩展
3. **一致性**：保持前后端数据格式统一
4. **安全性**：敏感字段使用可选类型，避免数据泄露

## 使用规范

### 导入方式
```typescript
import type { Host, User, ApiResponse } from '../entity/main';
```

### 类型断言
```typescript
// 安全的类型断言
const host = response.data as Host;

// 使用类型保护
function isHost(obj: any): obj is Host {
  return obj && typeof obj.host === 'string';
}
```

### 数据验证
```typescript
// 验证主机数据
function validateHost(host: Partial<Host>): host is Host {
  return !!(host.id && host.name && host.host);
}
```

## 扩展建议

1. **数据验证**：可以添加更详细的数据验证规则
2. **默认值**：为可选字段提供合理的默认值
3. **工具函数**：添加数据类型转换和验证工具函数
4. **文档生成**：使用 TypeDoc 自动生成类型文档

## 与其他模块的关系

- **API 模块**：使用这些类型定义请求和响应格式
- **组件模块**：Vue 组件使用这些类型进行 Props 定义
- **工具模块**：工具函数使用这些类型进行参数类型检查

## 最佳实践

1. 新数据类型应先在此文件中定义
2. 修改现有类型时需考虑向后兼容性
3. 复杂类型应添加详细的注释说明
4. 定期审查类型定义，确保与后端 API 保持一致