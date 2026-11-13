// VNC 连接工具
// 封装 hostInfo 组装、background 消息发送与结果判定，调用方只关心成功/失败

import browser from 'webextension-polyfill'

/** background 消息类型：调起 RealVNC */
export const VNC_CONNECT = 'vncConnect' as const

/** reportConnect 返回的连接信息（ip 缺失视为无效连接信息） */
export interface VncConnectionData {
  ip?: string
  port?: number | string
  username?: string
  password?: string
}

/** background vncConnect 的响应 */
interface VncConnectResponse {
  success?: boolean
  error?: string
}

/**
 * 组装 hostInfo 并通知 background 调起 RealVNC
 * 连接信息无效或调起失败时抛出 Error，由调用方统一走失败分支
 */
export const connectVnc = async (data: VncConnectionData | null | undefined): Promise<void> => {
  if (!data?.ip) {
    throw new Error('No VNC connection info returned')
  }
  const res = await browser.runtime.sendMessage({
    type: VNC_CONNECT,
    hostInfo: {
      host: data.ip,
      port: data.port,
      password: data.password,
      username: data.username,
    },
  }) as VncConnectResponse | undefined
  if (!res?.success) {
    throw new Error(res?.error || 'Failed to launch RealVNC')
  }
}
