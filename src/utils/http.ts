// Network request encapsulation module
// HTTP client based on Fetch API implementation

// Define request method type
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

import { warning } from '/@/utils/notification'
import browser from "webextension-polyfill";

// Define request configuration interface
export interface RequestConfig extends RequestInit {
  url: string;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  headers?: Record<string, string>;
  baseURL?: string; // Base URL configuration
}

// Define response data interface
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
}

// Define error interface
export interface HttpError extends Error {
  response?: HttpResponse;
  config: RequestConfig;
  code?: string;
}

// Create error handling function
function createError(message: string, config: RequestConfig, code?: string, response?: HttpResponse): HttpError {
  const error = new Error(message) as HttpError;
  error.config = config;
  error.code = code;
  error.response = response;
  return error;
}

// Check if URL needs to prepend baseURL
function shouldPrependBaseURL(url: string): boolean {
  // If URL starts with http:// or https://, no need to prepend baseURL
  return !url.startsWith('http://') && !url.startsWith('https://');
}

// Build complete URL (handle baseURL and query parameters)
function buildURL(url: string, baseURL?: string, params?: Record<string, any>): string {
  let fullURL = url;
  
  // If URL doesn't start with http:// or https://, and baseURL is configured, prepend baseURL
  console.log('URL concatenation:', baseURL, url)

  if (shouldPrependBaseURL(url) && baseURL) {
    // Ensure baseURL ends with /, URL doesn't start with /
    const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    const normalizedURL = url.startsWith('/') ? url : `/${url}`;
    fullURL = `${normalizedBaseURL}${normalizedURL}`;
  }
  
  // Handle query parameters
  if (!params) return fullURL;
  
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  return queryString ? `${fullURL}${fullURL.includes('?') ? '&' : '?'}${queryString}` : fullURL;
}

// Check response status
function checkStatus(response: Response, config: RequestConfig): Response {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else if(response.status == 404 || response.status == 500){
    warning('Service not responding or plugin version too low!')
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

// Parse response data
async function parseResponse<T = any>(response: Response, config: RequestConfig): Promise<HttpResponse<T>> {
  let data: T;
  
  try {
    // Try to parse JSON, if fails return text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Try to parse text as JSON, if fails return text directly
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

// Request timeout handling
function timeoutPromise(promise: Promise<any>, ms: number, config: RequestConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createError('Request timeout', config, 'TIMEOUT_ERROR'));
    }, ms);
    warning('Please check your local network!')
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// Get baseURL from environment variables
function getBaseURLFromEnv(): string | undefined {

  // In browser environment, environment variables accessed via import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_BASE_URL || import.meta.env.BASE_URL;
  }
  // In Node.js environment, accessed via process.env
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env.VITE_BASE_URL || process.env.BASE_URL;
  }
  return undefined;
}

// Cross-origin request proxy function
export const proxyFetch = (url: string, options: any = {}) => {

  return new Promise((resolve, reject) => {
        // @ts-ignore Use chrome.runtime in content script, browser.runtime in background script
        const runtime = browser.runtime

        const requestUrl = buildURL(url, defaultConfig.baseURL, options.params);
        
        console.log('proxyFetch call:', requestUrl, options.method, options.body);
        
        runtime.sendMessage({
            type: 'apiRequest',
            url: requestUrl,
            method: options.method || 'GET',
            headers: options.headers || {},
            credentials: options.credentials || 'omit',
            body: options.body // Add body parameter
        }).then((res: Record<string, any>) => {
          if(res.success && res.data !== undefined){
            resolve(res.data)
          } else {
            reject(res.error)
          }
        }).catch((err: Record<string, any>) => {
          reject(err)
        })
  })

}

// Default configuration
const defaultConfig: Partial<RequestConfig> = {
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // Default timeout 30 seconds
  credentials: 'include', // Include cookies
  baseURL: getBaseURLFromEnv() // Get baseURL from environment variables
};

// Request interceptor list
const requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = [];

// Response interceptor list
const responseInterceptors: Array<(response: HttpResponse) => HttpResponse | Promise<HttpResponse>> = [];

// Response error interceptor list
const responseErrorInterceptors: Array<(error: HttpError) => HttpError | Promise<HttpError>> = [];

// Core method to send requests
async function request<T = any>(config: RequestConfig): Promise<HttpResponse<T>> {
  // Merge configurations
  const mergedConfig: RequestConfig = {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config.headers
    }
  };
  
  try {
    // Apply request interceptors
    let processedConfig = { ...mergedConfig };
    for (const interceptor of requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    // Prepare request parameters
    const { url, method = 'GET', params, data, timeout, baseURL, ...fetchOptions } = processedConfig;
    const requestUrl = buildURL(url, baseURL, params);
    
    // If there is data, and it's not a GET/HEAD request, set body
    if (data && method !== 'GET' && method !== 'HEAD') {
      if (typeof data === 'object' && !(data instanceof FormData)) {
        fetchOptions.body = JSON.stringify(data);
      } else {
        fetchOptions.body = data;
      }
    }
    
    // Send request
    let fetchPromise = fetch(requestUrl, {
      ...fetchOptions,
      method
    })
      .then(response => checkStatus(response, processedConfig))
      .then(response => parseResponse<T>(response, processedConfig));
    
    // If timeout is set, apply timeout handling
    if (timeout) {
      fetchPromise = timeoutPromise(fetchPromise, timeout, processedConfig);
    }
    
    // Get response
    let response = await fetchPromise;
    
    // Apply response interceptors
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response);
    }
    
    return response;
  } catch (error) {
    // Apply response error interceptors
    let processedError = error as HttpError;
    for (const interceptor of responseErrorInterceptors) {
      processedError = await interceptor(processedError);
    }
    
    throw processedError;
  }
}

// Convenience method: GET
export function get<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'GET'
  });
}

// Convenience method: POST
export function post<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'POST',
    data
  });
}

// Convenience method: PUT
export function put<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'PUT',
    data
  });
}

// Convenience method: DELETE
export function del<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'DELETE'
  });
}

// Convenience method: PATCH
export function patch<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>> {
  return request<T>({
    ...config,
    url,
    method: 'PATCH',
    data
  });
}

// Add request interceptor
export function addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>): void {
  requestInterceptors.push(interceptor);
}

// Add response interceptor
export function addResponseInterceptor(interceptor: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>): void {
  responseInterceptors.push(interceptor);
}

// Add response error interceptor
export function addResponseErrorInterceptor(interceptor: (error: HttpError) => HttpError | Promise<HttpError>): void {
  responseErrorInterceptors.push(interceptor);
}

// Set default configuration
export function setDefaults(config: Partial<RequestConfig>): void {
  Object.assign(defaultConfig, config);
}

// Export default object
const http = {
  request,
  get,
  post,
  put,
  delete: del, // Use del as alias for delete to avoid keyword conflict
  patch,
  addRequestInterceptor,
  addResponseInterceptor,
  addResponseErrorInterceptor,
  setDefaults
};

export default http;

// Example usage instructions:
/*
// Basic usage
import http from './http';

// GET request
http.get('/api/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Request failed:', error);
  });

// POST request
http.post('/api/users', { name: 'John', age: 30 })
  .then(response => {
    console.log('Created successfully:', response.data);
  })
  .catch(error => {
    console.error('Creation failed:', error);
  });

// Add request interceptor
http.addRequestInterceptor(config => {
  // Add authentication token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// Add response interceptor
http.addResponseInterceptor(response => {
  // Unified response data processing
  return response;
});

// Add error interceptor
http.addResponseErrorInterceptor(error => {
  // Handle 401 unauthorized
  if (error.response && error.response.status === 401) {
    // Redirect to login page
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// Set default configuration
http.setDefaults({
  baseURL: 'https://api.example.com',
  timeout: 5000
});
*/