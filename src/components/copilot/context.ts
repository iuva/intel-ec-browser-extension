import type { InjectionKey } from 'vue'

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
}

export const PANEL_API_KEY: InjectionKey<PanelApi> = Symbol('CopilotPanelApi')
