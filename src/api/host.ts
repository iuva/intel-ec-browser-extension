/**
 * host相关接口封装
 */

import http from '/@/utils/http'
import { proxyFetch } from '/@/utils/http'


const urls = {
    available: `/host/hosts/available`,
    retry: `/host/hosts/retry-vnc`,
    release: `/host/hosts/release`,
    connect: `/host/hosts/vnc/connect`,
    report: `/host/hosts/vnc/report`,
}


/**
 * 获取可用主机列表
 * @returns 可用主机列表
 */
export const getAvailableList = (data: Record<any, any>) => proxyFetch(urls.available, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * 获取重试主机列表
 * @returns 重试主机列表
 */
export const getRetryList = (data: Record<any, any>) => proxyFetch(urls.retry, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * 释放主机
 */
export const releaseHost = (data: Record<any, any>) => proxyFetch(urls.release, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * 获取连接信息
 */
export const hostInfo = (data: Record<any, any>) => proxyFetch(urls.connect, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * 上报连接结果
 */
export const reportConnect = (data: Record<any, any>) => proxyFetch(urls.report, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

