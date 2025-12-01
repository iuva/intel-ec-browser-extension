// 网络请求封装模块
// 基于Fetch API实现的HTTP客户端

// 定义请求方法类型
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

import { warning } from '/@/utils/notification'

// 定义请求配置接口
export interface RequestConfig extends RequestInit {
  url: string;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  headers?: Record<string, string>;
  baseURL?: string; // 基础URL配置
}

// 定义响应数据接口
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
}

// 定义错误接口
export interface HttpError extends Error {
  response?: HttpResponse;
  config: RequestConfig;
  code?: string;
}

// 创建错误处理函数
function createError(message: string, config: RequestConfig, code?: string, response?: HttpResponse): HttpError {
  const error = new Error(message) as HttpError;
  error.config = config;
  error.code = code;
  error.response = response;
  return error;
}

// 检查URL是否需要拼接baseURL
function shouldPrependBaseURL(url: string): boolean {
  // 如果URL以http://或https://开头，则不需要拼接baseURL
  return !url.startsWith('http://') && !url.startsWith('https://');
}

// 构建完整URL（处理baseURL和查询参数）
function buildURL(url: string, baseURL?: string, params?: Record<string, any>): string {
  let fullURL = url;
  
  // 如果URL不以http://或https://开头，且配置了baseURL，则拼接baseURL
  console.log('url拼接：', baseURL, url)

  if (shouldPrependBaseURL(url) && baseURL) {
    // 确保baseURL以/结尾，url不以/开头
    const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    const normalizedURL = url.startsWith('/') ? url : `/${url}`;
    fullURL = `${normalizedBaseURL}${normalizedURL}`;
  }
  
  // 处理查询参数
  if (!params) return fullURL;
  
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  return queryString ? `${fullURL}${fullURL.includes('?') ? '&' : '?'}${queryString}` : fullURL;
}

// 检查响应状态
function checkStatus(response: Response, config: RequestConfig): Response {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else if(response.status == 404 || response.status == 500){
    warning('服务未响应或插件版本过低！')
  }
  
  const error = createError(
    `Request failed with status code ${response.status}`,
    config,
    `HTTP_ERROR_${response.status}`,
    {
      data: response,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config
    }
  );
  
  throw error;
}

// 解析响应数据
async function parseResponse<T = any>(response: Response, config: RequestConfig): Promise<HttpResponse<T>> {
  let data: T;
  
  try {
    // 尝试解析JSON，如果失败则返回文本
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // 尝试将文本解析为JSON，失败则直接返回文本
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = text as unknown as T;
      }
    }
  } catch (error) {
    throw createError('Failed to parse response', config, 'PARSE_ERROR');
  }
  
  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config
  };
}

// 请求超时处理
function timeoutPromise(promise: Promise<any>, ms: number, config: RequestConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createError('Request timeout', config, 'TIMEOUT_ERROR'));
    }, ms);
    warning('请检查本地网络！')
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// 从环境变量获取baseURL
function getBaseURLFromEnv(): string | undefined {

  // 在浏览器环境中，环境变量通过import.meta.env访问
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_BASE_URL || import.meta.env.BASE_URL;
  }
  // 在Node.js环境中，通过process.env访问
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env.VITE_BASE_URL || process.env.BASE_URL;
  }
  return undefined;
}

// 跨域请求代理函数
export const proxyFetch = (url: string, options: any = {}) => {

  return new Promise((resolve, reject) => {
        // @ts-ignore 在content script中使用chrome.runtime，在background script中使用browser.runtime
        const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

        const requestUrl = buildURL(url, defaultConfig.baseURL, options.params);
        
        console.log('proxyFetch调用:', requestUrl, options.method, options.body);
        
        runtime.sendMessage({
            type: 'apiRequest',
            url: requestUrl,
            method: options.method || 'GET',
            headers: options.headers || {},
            credentials: options.credentials || 'omit',
            body: options.body // 添加body参数
        }).then((res: Record<string, any>) => {
          if(res.success && res.data !== undefined && res.data.code == 200){
            resolve(res.data)
          } else {
            reject(res.error)
          }
        }).catch((err: Record<string, any>) => {
          reject(err)
        })
  })

}

// 默认配置
const defaultConfig: Partial<RequestConfig> = {
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 默认超时30秒
  credentials: 'include', // 包含cookies
  baseURL: getBaseURLFromEnv() // 从环境变量获取baseURL
};

// 请求拦截器列表
const requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = [];

// 响应拦截器列表
const responseInterceptors: Array<(response: HttpResponse) => HttpResponse | Promise<HttpResponse>> = [];

// 响应错误拦截器列表
const responseErrorInterceptors: Array<(error: HttpError) => HttpError | Promise<HttpError>> = [];

// 发送请求的核心方法
async function request<T = any>(config: RequestConfig): Promise<HttpResponse<T>> {
  // 合并配置
  const mergedConfig: RequestConfig = {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config.headers
    }
  };
  
  try {
    // 应用请求拦截器
    let processedConfig = { ...mergedConfig };
    for (const interceptor of requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    // 准备请求参数
    const { url, method = 'GET', params, data, timeout, baseURL, ...fetchOptions } = processedConfig;
    const requestUrl = buildURL(url, baseURL, params);
    
    // 如果有数据，且不是GET/HEAD请求，则设置body
    if (data && method !== 'GET' && method !== 'HEAD') {
      if (typeof data === 'object' && !(data instanceof FormData)) {
        fetchOptions.body = JSON.stringify(data);
      } else {
        fetchOptions.body = data;
      }
    }
    
    // 发送请求
    let fetchPromise = fetch(requestUrl, {
      ...fetchOptions,
      method
    })
      .then(response => checkStatus(response, processedConfig))
      .then(response => parseResponse<T>(response, processedConfig));
    
    // 如果设置了超时，应用超时处理
    if (timeout) {
      fetchPromise = timeoutPromise(fetchPromise, timeout, processedConfig);
    }
    
    // 获取响应
    let response = await fetchPromise;
    
    // 应用响应拦截器
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response);
    }
    
    return response;
  } catch (error) {
    // 应用响应错误拦截器
    let processedError = error as HttpError;
    for (const interceptor of responseErrorInterceptors) {
      processedError = await interceptor(processedError);
    }
    
    throw processedError;
  }
}

// 便捷方法：GET
export function get<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'GET'
  });
}

// 便捷方法：POST
export function post<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'POST',
    data
  });
}

// 便捷方法：PUT
export function put<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'PUT',
    data
  });
}

// 便捷方法：DELETE
export function del<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'DELETE'
  });
}

// 便捷方法：PATCH
export function patch<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'PATCH',
    data
  });
}

// 添加请求拦截器
export function addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>): void {
  requestInterceptors.push(interceptor);
}

// 添加响应拦截器
export function addResponseInterceptor(interceptor: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>): void {
  responseInterceptors.push(interceptor);
}

// 添加响应错误拦截器
export function addResponseErrorInterceptor(interceptor: (error: HttpError) => HttpError | Promise<HttpError>): void {
  responseErrorInterceptors.push(interceptor);
}

// 设置默认配置
export function setDefaults(config: Partial<RequestConfig>): void {
  Object.assign(defaultConfig, config);
}

// 导出默认对象
const http = {
  request,
  get,
  post,
  put,
  delete: del, // 使用del作为delete的别名，避免与关键字冲突
  patch,
  addRequestInterceptor,
  addResponseInterceptor,
  addResponseErrorInterceptor,
  setDefaults
};

export default http;

// 示例使用说明：
/*
// 基本使用
import http from './http';

// GET请求
http.get('/api/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('请求失败:', error);
  });

// POST请求
http.post('/api/users', { name: '张三', age: 30 })
  .then(response => {
    console.log('创建成功:', response.data);
  })
  .catch(error => {
    console.error('创建失败:', error);
  });

// 添加请求拦截器
http.addRequestInterceptor(config => {
  // 添加认证token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// 添加响应拦截器
http.addResponseInterceptor(response => {
  // 统一处理响应数据
  return response;
});

// 添加错误拦截器
http.addResponseErrorInterceptor(error => {
  // 处理401未授权
  if (error.response && error.response.status === 401) {
    // 跳转到登录页
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// 设置默认配置
http.setDefaults({
  baseURL: 'https://api.example.com',
  timeout: 5000
});
*/