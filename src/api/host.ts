/**
 * Host related API encapsulation
 */

import { proxyFetch } from '/@/utils/http'


const urls = {
    available: `/host/hosts/available`,
    retry: `/host/hosts/retry-vnc`,
    release: `/host/hosts/release`,
    connect: `/host/hosts/vnc/connect`,
    report: `/host/hosts/vnc/report`,
    stats: `/host/hosts/stats`,
}

/** 状态统计条请求（独立于分页列表） */
export interface HostStatsQuery {
    tc_id: string
    cycle_name: string
    user_name: string
}

/** 状态统计条接口原始返回（snake_case） */
export interface HostStatsRaw {
    total: number
    free: number
    occupied: number
    running: number
    offline: number
}

/** 状态统计条接口包装响应 */
export interface HostStatsPage {
    code: number
    data: HostStatsRaw
}

/** HOST 状态统计（Let's Test 顶部统计条使用） */
export interface HostStatusStats {
    Free: number
    Occupied: number
    Running: number
    Offline: number
}

/** 通用分页响应 */
export interface HostListPage<T> {
    code: number
    data: {
        hosts: T[]
        total: number
        /** 是否有下一页 */
        has_next: boolean
        /** 分页游标：上一页最后一个 host_id；首屏/末页为 null */
        last_id?: string | null
    }
}

export interface AvailableHostVO {
    host_id: string
    host_rec_id?: string
    user_name: string
    host_name: string
    status: 'Free' | 'Occupied' | 'Running' | 'Offline'
    /** Used By */
    occupier?: string
    /** Used Time */
    occupy_time?: string
    /** Occupy Dur */
    occupy_duration?: string
}

export interface OccupiedHostVO {
    host_id: string
    host_rec_id?: string
    tc_id: string
    host_name: string
    status: 'Occupied' | 'Running'
    /** Last Time */
    last_time?: string
    /** Used Time */
    occupy_time?: string
    /** Occupy Dur */
    occupy_duration?: string
}

export interface AvailableHostPage extends HostListPage<AvailableHostVO> {
    stats: HostStatusStats
}

export interface AvailableHostQuery {
    tc_id: string
    cycle_name: string
    email: string
    user_name: string
    page_size?: number
    /** 分页游标：上一页最后一个 host_id；首屏不传 */
    last_id?: string
}

export interface RetryHostQuery {
    user_id: string
    page_size?: number
    cursor?: string | null
}

/**
 * Get available host list
 * @returns Available host list
 */
export const getAvailableList = (data: AvailableHostQuery) =>
    proxyFetch<AvailableHostPage>(urls.available, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...data, page_size: data.page_size ?? 50})
    })

/**
 * Get retry host list
 * @returns Retry host list
 */
export const getRetryList = (data: RetryHostQuery) =>
    proxyFetch<HostListPage<OccupiedHostVO>>(urls.retry, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...data, page_size: data.page_size ?? 50, cursor: data.cursor ?? null})
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
export const reportConnect = (data: Record<any, any>) => proxyFetch(urls.connect, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
})

/**
 * Get host status stats（独立接口，与 available 分页解耦）
 */
export const fetchHostStats = (data: HostStatsQuery) =>
    proxyFetch<HostStatsPage>(urls.stats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
