/**
 * 鉴权相关接口封装
 */

import http from '/@/utils/http'
import { proxyFetch } from '/@/utils/http'

const urls = {
    user: 'https://hsdes.intel.com/rest/user?expand=personal',
    auth: 'https://plan.xcopilot.intel.com/api/v1/auth/login'
}

// 获取用户信息
export const getUserInfo = () => {
    // 使用代理方式处理跨域请求
    return proxyFetch(urls.user, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
}

// 用户鉴权
export const userAuth = (userId: string) => {
    // 使用代理方式处理跨域请求
    return proxyFetch(urls.auth, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "idsid": userId
        })
    })
}
