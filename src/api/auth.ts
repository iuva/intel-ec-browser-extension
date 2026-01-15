/**
 * Authentication related API encapsulation
 */

import http from '/@/utils/http'
import { proxyFetch } from '/@/utils/http'

const urls = {
    user: 'https://hsdes.intel.com/rest/user?expand=personal',
    auth: 'https://plan.xcopilot.intel.com/api/v1/auth/login'
}

// Get user information
export const getUserInfo = () => {
    // Use proxy method to handle cross-origin requests
    return proxyFetch(urls.user, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
}

// User authentication
export const userAuth = (userId: string) => {
    // Use proxy method to handle cross-origin requests
    return proxyFetch(urls.auth, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "idsid": userId
        })
    })
}
