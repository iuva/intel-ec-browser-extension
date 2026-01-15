// Main view entity definition


/**
 * Component position information
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
 * Component position information
 */
export interface MainPosition {
  left: string
  right: string
  top: number
  width: number
  height: number
}

/**
 * Component callback function entity
 */
export interface CallbackEntity {
  focus?: (event?: Event) => void
  blur?: (event?: Event) => void
  click?: (event?: Event) => void
  dragEnd?: (event?: Event, position?: MainPosition) => void
}
