import type { InjectionKey, Ref } from 'vue'
import type {
  AvailableHostPage,
  AvailableHostVO,
  HostListPage,
  HostStatsRaw,
  HostStatusStats,
  OccupiedHostVO,
} from '/@/api/host'

export type { HostStatusStats }

/** 登录用户信息（Main.vue 下发） */
export interface CopilotUserInfo {
  full_name: string
  email: string
}

/** 页签操作 HOST 时使用的标识（release 用 hostId，connect 优先 hostRecId） */
export interface CopilotHostRef {
  hostId: string
  hostRecId?: string
  host: string
  /** Let's Test 连接时传入当前 TC_ID；My HOST 不传 */
  tcId?: string | null
}

export type CopilotAvailableHost = AvailableHostVO
export type CopilotOccupiedHost = OccupiedHostVO

/** 面板页签标识（与原型 data-tab 一致） */
export type CopilotTab = 'occupied' | 'available' | 'query'

/** 面板内确认弹窗选项（原型 openConfirm） */
export interface PanelConfirmOptions {
  title: string
  message: string
  /** 确认按钮文案，默认 'Confirm' */
  confirmText?: string
  /** warning：警示图标 + 红色确认按钮；info：连接图标 + 蓝色确认按钮 */
  type?: 'warning' | 'info'
}

/** 结果浮层操作按钮 */
export interface PanelResultAction {
  text: string
  /** 点击后随 onAction 回传给调用方 */
  action: string
  /** confirm：主色按钮；cancel：白底描边按钮 */
  style?: 'confirm' | 'cancel'
}

/** 面板内结果浮层选项（原型 showIndicatorResult） */
export interface PanelResultOptions {
  success: boolean
  title: string
  message?: string
  actions?: PanelResultAction[]
  /** 自动关闭时长（ms），成功态原型为 4000 */
  autoClose?: number
  /** 结果浮层操作按钮点击回调 */
  onAction?: (action: string) => void
}

/** 面板外壳提供给各页签组件的能力（provide/inject 解耦） */
export interface PanelApi {
  /** 面板内确认弹窗：resolve(true) = 点击确认 */
  confirm(options: PanelConfirmOptions): Promise<boolean>
  /** 面板内 loading 浮层（原型 showIndicatorLoading） */
  showLoading(text?: string): void
  /** 面板内结果浮层（原型 showIndicatorResult / autoCloseSuccess） */
  showResult(options: PanelResultOptions): void
  /** 关闭 loading / 结果浮层 */
  hideIndicator(): void
  /** 拉取 Let's Test 可用 HOST（分页：last_id=上一页最后host_id，首屏不传） */
  fetchAvailableHosts(params: { tcId: string; lastId?: string; pageSize: number }): Promise<AvailableHostPage>
  /** 拉取 Let's Test 顶部状态统计（独立接口，与分页解耦） */
  fetchHostStats(params: { tcId: string }): Promise<HostStatsRaw>
  /** 拉取 My HOST 待恢复 HOST（游标分页） */
  fetchOccupiedHosts(params: { cursor: string | null; pageSize: number }): Promise<HostListPage<CopilotOccupiedHost>>
  /** 释放 HOST（Cancel Test） */
  releaseHost(item: CopilotOccupiedHost): Promise<void>
  /** 建立连接并拉起 RealVNC */
  connectHost(item: CopilotHostRef): Promise<void>
}

export const PANEL_API_KEY: InjectionKey<PanelApi> = Symbol('CopilotPanelApi')

/** 面板可见性（Main.vue provide；Main 子树内组件可选择性 watch） */
export interface PanelVisibilityApi {
  /** 面板是否可见（只读）；关闭/隐藏为 false */
  visible: Readonly<Ref<boolean>>
}

export const PANEL_VISIBILITY_KEY: InjectionKey<PanelVisibilityApi> =
  Symbol('CopilotPanelVisibility')
