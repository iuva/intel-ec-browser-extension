// 主视图实体定义


/**
 * 组件位置信息
 */
export interface MainParam {
  background?: 'blue' | 'warning',
  icon?: 'none' | 'close' | 'warning' | 'search' | 'loading',
  appear?: 'focus' | 'not-appear' | 'appear',
  borderRadius?: 'none' | 'top' | 'bottom',
  text?: string,
  hostText?: string,
  isTc?: boolean,
}


/**
 * 组件位置信息
 */
export interface MainPosition {
  left: string
  right: string
  top: number
  width: number
  height: number
}

/**
 * 组件回调函数实体
 */
export interface CallbackEntity {
  focus?: (event?: Event) => void
  blur?: (event?: Event) => void
  click?: (event?: Event) => void
  dragEnd?: (event?: Event, position?: MainPosition) => void
}
