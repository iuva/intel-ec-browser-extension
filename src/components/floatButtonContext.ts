import type { InjectionKey } from 'vue'

/** FloatButton tooltip 默认文案 */
export const DEFAULT_FLOAT_BUTTON_TOOLTIP = 'Open panel'

/**
 * 浮钮 tooltip 控制能力。
 *
 * 由 Main.vue（组合根）provide，任意后代组件 inject 后调用；
 * 调用方只依赖本接口，不直接依赖 FloatButton 组件或其内部实现。
 */
export interface FloatButtonApi {
  /** 更新 tooltip 文案；空内容（空串/空白/null）清空自定义文案并回落默认文案 */
  updateTooltip(text?: string | null): void
  /**
   * 临时展示 tooltip。
   * @param duration 展示毫秒数；重复调用重置计时，duration <= 0 立即结束
   * @param text 本次展示的文案（可空，空时沿用当前文案）
   * @param clearAfter 展示完毕后是否清空文案（默认 false，清空后回落默认文案）
   */
  showTooltip(duration: number, text?: string | null, clearAfter?: boolean): void
  /**
   * 重置 tooltip 文案（清空自定义文案，展示回落默认文案）。
   * @param waitForEnd 是否等待当前临时展示结束后再清空文案（默认 true；无展示时立即清空）
   * @param interrupt 是否立即中断临时展示（默认 false；为 true 时停止展示并立即清空）
   */
  resetTooltip(waitForEnd?: boolean, interrupt?: boolean): void
}

export const FLOAT_BUTTON_API_KEY: InjectionKey<FloatButtonApi> = Symbol('FloatButtonApi')
