/**
 * 鉴权相关接口封装
 */

import http from '/@/utils/http'
import { proxyFetch } from '/@/utils/http'

const urls = {
    user: 'https://hsdes.intel.com/rest/user?expand=personal'
}

// 使用代理方式处理跨域请求
export const getUserInfo = () => {
    return proxyFetch(urls.user, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
}

