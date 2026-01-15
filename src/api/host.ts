/**
 * Host related API encapsulation
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
 * Get available host list
 * @returns Available host list
 */
export const getAvailableList = (data: Record<any, any>) => proxyFetch(urls.available, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * Get retry host list
 * @returns Retry host list
 */
export const getRetryList = (data: Record<any, any>) => proxyFetch(urls.retry, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * Release host
 */
export const releaseHost = (data: Record<any, any>) => proxyFetch(urls.release, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * Get connection information
 */
export const hostInfo = (data: Record<any, any>) => proxyFetch(urls.connect, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * Report connection result
 */
export const reportConnect = (data: Record<any, any>) => proxyFetch(urls.report, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

