// TC (Test Case) 页面工具类
// 封装 TC 页面判断、TC ID 提取与监听等能力，逻辑来源于 components/main.vue 中的实现

// TC 执行页面路径
export const TC_PAGE_PATH = '/appstore/phoenix/execution'

// TC ID 所在的 record 层级容器选择器
const TC_CONTAINER_SELECTOR = '.record-hierarchy-container'

// TC ID 在 DOM 文本中的格式，例如: "xxx [TC ID 123456]"
const TC_ID_PATTERN = /\[TC ID\s*([^\]]*)/

class TcUtils {
  /**
   * 从文本中提取 TC ID
   * 兼容 main.vue 中 split('[TC ID') 的解析方式，并增强为正则匹配，避免出现多个 [TC ID 时解析异常
   */
  private extractTCId(text: string): string | null {
    const match = text.match(TC_ID_PATTERN)
    if (!match) {
      return null
    }
    const id = match[1].trim()
    return id || null
  }

  /**
   * 当前页面是否为 TC 执行页面
   */
  isTC(): boolean {
    return location.pathname === TC_PAGE_PATH
  }

  /**
   * 获取当前页面的 TC ID
   * 优先从选中的(.selected) record 容器提取，其次取第一个可提取到的容器
   * 未获取到时返回 null
   */
  getTCID(): string | null {
    const containers = document.querySelectorAll<HTMLElement>(TC_CONTAINER_SELECTOR)
    let fallback: string | null = null

    // Array.from 包装：项目 tsconfig 未包含 DOM.Iterable，直接 for...of NodeList 会报类型错误
    for (const container of Array.from(containers)) {
      const id = this.extractTCId(container.innerText)
      if (!id) {
        continue
      }
      // 选中的 record 优先
      if (container.classList.contains('selected')) {
        return id
      }
      fallback = fallback ?? id
    }

    return fallback
  }

  /**
   * 获取 URL 中的 cycle 参数（与 TC ID 配套使用）
   */
  getCycle(): string | null {
    return new URLSearchParams(window.location.search).get('cycle')
  }

  /**
   * 监听 TC ID 变化，仅在 TC 执行页面内生效
   * TC ID 发生变化（包括获取不到时回调 null）时触发回调
   * @param callback TC ID 变化回调
   * @param immediate 是否立即回调一次当前 TC ID，默认 true
   * @returns 取消监听函数
   */
  watchTCID(callback: (tcId: string | null) => void, immediate = true): () => void {
    // undefined 表示尚未提取过，保证首次提取结果（含 null）一定触发回调
    let lastId: string | null | undefined = undefined
    let timer: ReturnType<typeof setTimeout> | null = null

    const check = () => {
      // 与 main.vue 行为一致：仅 TC 执行页面内解析
      if (!this.isTC()) {
        return
      }
      const id = this.getTCID()
      if (id !== lastId) {
        lastId = id
        callback(id)
      }
    }

    // 与 main.vue 的 setTimeout(100) 一致：等待 DOM 稳定后再解析，同时合并高频变化
    const scheduleCheck = () => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = null
        check()
      }, 100)
    }

    if (immediate) {
      check()
    }

    const observer = new MutationObserver((mutations) => {
      // 仅处理与 record 容器相关的变化，避免无关 DOM 变化触发解析
      const related = mutations.some((mutation) => {
        const target = mutation.target
        return target instanceof HTMLElement && (
          target.classList.contains('selected') ||
          target.classList.contains('record-hierarchy-container')
        )
      })
      if (related) {
        scheduleCheck()
      }
    })

    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-route', 'href']
    })

    return () => {
      observer.disconnect()
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
  }
}

const tcUtils = new TcUtils()

// 导出工具方法
export const isTC = tcUtils.isTC.bind(tcUtils)
export const getTCID = tcUtils.getTCID.bind(tcUtils)
export const getCycle = tcUtils.getCycle.bind(tcUtils)
export const watchTCID = tcUtils.watchTCID.bind(tcUtils)

// 导出默认实例
export default tcUtils
