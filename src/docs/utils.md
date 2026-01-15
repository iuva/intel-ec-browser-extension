# 工具函数模块说明

## 目录功能概述

`utils/` 目录包含了浏览器扩展中使用的所有通用工具函数和工具类，提供可复用的功能模块。

## 文件说明

### 🌐 http.ts
**HTTP 请求工具**

**功能描述：**
- 基于 Fetch API 封装的 HTTP 客户端
- 提供统一的请求/响应拦截器
- 支持跨域请求代理
- 自动处理错误和重试机制

**主要功能：**
- `proxyFetch(url, options)` - 跨域请求代理
- `addRequestInterceptor(interceptor)` - 添加请求拦截器
- `addResponseInterceptor(interceptor)` - 添加响应拦截器
- `setBaseURL(url)` - 设置基础 URL

**使用示例：**
```typescript
import http from './utils/http';

// 基本 GET 请求
const data = await http.get('/api/hosts');

// 带参数的 POST 请求
const result = await http.post('/api/login', {
  username: 'admin',
  password: '123456'
});

// 添加认证拦截器
http.addRequestInterceptor(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 📢 notification.ts
**通知工具类**

**功能描述：**
- 提供全局消息通知功能
- 支持多种通知类型（信息、成功、警告、错误）
- 响应式设计，适配不同屏幕尺寸
- 支持自定义样式和交互

**通知类型：**
- `NotificationType.INFO` - 信息通知
- `NotificationType.SUCCESS` - 成功通知
- `NotificationType.WARNING` - 警告通知
- `NotificationType.ERROR` - 错误通知

**主要方法：**
- `notify(message, config)` - 通用通知方法
- `info(message, config)` - 信息通知
- `success(message, config)` - 成功通知
- `warning(message, config)` - 警告通知
- `error(message, config)` - 错误通知
- `clearAll()` - 清除所有通知

**使用示例：**
```typescript
import { info, success, error } from './utils/notification';

// 显示成功通知
success('操作成功完成！');

// 显示错误通知（5秒后自动关闭）
error('连接失败，请检查网络', { duration: 5000 });

// 自定义通知
notify('自定义消息', {
  type: NotificationType.WARNING,
  duration: 3000,
  showClose: true,
  onClick: () => console.log('通知被点击')
});
```

### 🪟 modal.ts
**模态框工具**

**功能描述：**
- 提供模态框显示和管理功能
- 支持多种模态框类型（确认、提示、表单等）
- 提供动画效果和键盘交互支持

**主要功能：**
- `showModal(options)` - 显示模态框
- `confirm(message, options)` - 确认对话框
- `alert(message, options)` - 提示对话框
- `prompt(message, options)` - 输入对话框
- `closeModal(id)` - 关闭指定模态框
- `closeAllModals()` - 关闭所有模态框

**使用示例：**
```typescript
import { confirm, prompt } from './utils/modal';

// 确认对话框
const confirmed = await confirm('确定要删除这个主机吗？');
if (confirmed) {
  // 执行删除操作
}

// 输入对话框
const username = await prompt('请输入用户名：', {
  placeholder: '用户名',
  validator: (value) => value.length >= 3
});
```

## 工具设计原则

1. **单一职责**：每个工具函数只负责一个特定功能
2. **易于使用**：提供简洁的 API 接口
3. **类型安全**：完整的 TypeScript 类型定义
4. **错误处理**：完善的错误处理机制
5. **性能优化**：避免不必要的性能开销

## 扩展建议

1. **缓存工具**：添加本地存储和缓存管理工具
2. **日期工具**：提供日期格式化和计算功能
3. **验证工具**：添加数据验证和表单验证工具
4. **加密工具**：提供简单的加密解密功能

## 最佳实践

1. 新工具函数应先在此目录中创建
2. 复杂工具应拆分为多个小函数
3. 工具函数应包含完整的单元测试
4. 定期审查工具函数，移除不再使用的代码

## 依赖关系

- **独立运行**：工具函数应尽量独立，减少外部依赖
- **浏览器 API**：合理使用浏览器原生 API
- **第三方库**：谨慎引入第三方依赖，避免包体积过大