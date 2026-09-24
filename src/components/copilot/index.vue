<!-- index.vue -->
<script setup lang="ts">
import { provide, ref, watch, onUnmounted } from 'vue'
import TabHost from './tabHost.vue'
import TabTest from './tabTest.vue'
import TabQuery from './tabQuery.vue'
import type { HostOccupyItem } from './tabHost.vue'
import type { TestHostItem } from './tabTest.vue'
import type { QueryHostItem } from './tabQuery.vue'
import {
  PANEL_API_KEY,
  type PanelApi,
  type PanelConfirmOptions,
  type PanelResultOptions,
  type CopilotTab,
} from './context'
import { imgLogo, imgCancelTest, imgRemoteConnect, imgSuccess, imgFail } from './images'

/**
 * xCopilot 插件面板外壳（样式还原自 prototype/browser-plugin-prototype.html 的 .plugin-panel）。
 * 仅承载：面板容器 / 头部 / 页签切换 / 确认弹窗与 loading、结果浮层；
 * 三个页签内容分别由 tabHost.vue / tabTest.vue / tabQuery.vue 独立实现。
 *
 * 入参（props）：
 * - position 面板停靠侧：'right'（默认，浮钮同侧）| 'left'
 * - user     标题右侧的用户文本信息（如邮箱）
 * - onShow   面板显示回调（open() 触发）
 * - onClose  面板关闭回调（关闭按钮 / close() 触发）
 * - state    状态（预留）
 *
 * 组件方法（defineExpose）：
 * - open() / close()              显示与关闭面板
 * - setTab(tab)                   切换页签
 * - confirm(opts)                 面板内确认弹窗，Promise<boolean>
 * - showLoading(text) / showResult(opts) / hideIndicator()
 */
const props = withDefaults(defineProps<{
  position?: 'left' | 'right'
  user?: string
  onShow?: () => void
  onClose?: () => void
  state?: string
}>(), {
  position: 'right',
  user: '',
  onShow: undefined,
  onClose: undefined,
  state: '',
})

const show = defineModel('show', {type: Boolean, default: false})

/** 各页签业务事件向父级转发（业务接入点） */
const emit = defineEmits<{
  (e: 'release', item: HostOccupyItem): void
  (e: 'remote', item: HostOccupyItem | TestHostItem): void
  (e: 'start-test', host: TestHostItem): void
  (e: 'tc-change', tcId: string | null): void
  (e: 'search', requirement: string): void
  (e: 'host-open', host: QueryHostItem): void
}>()

const activeTab = ref<CopilotTab>('occupied')
/** My HOST 徽标（tabHost 数量变化驱动） */
const occupiedCount = ref(0)
/** 顶栏用户文案联动提示（tabTest 状态机驱动，null 时显示 user） */
const userHint = ref<string | null>(null)

const open = () => {
  show.value = true
  props.onShow?.()
}

const close = () => {
  show.value = false
  props.onClose?.()
}

const switchTab = (tab: CopilotTab) => {
  activeTab.value = tab
  // 与原型一致：切页签重置顶栏联动文案（新页签挂载后自行刷新提示）
  userHint.value = null
}

const onUserHint = (hint: string | null) => {
  userHint.value = hint
}

// ===== 确认弹窗（原型 confirm-overlay / confirm-dialog） =====
const confirmVisible = ref(false)
const confirmOpts = ref<Required<Pick<PanelConfirmOptions, 'title' | 'message'>> & PanelConfirmOptions>({
  title: '',
  message: '',
  confirmText: 'Confirm',
  type: 'warning',
})
let confirmResolve: ((ok: boolean) => void) | null = null

const confirm = (options: PanelConfirmOptions): Promise<boolean> => {
  confirmOpts.value = { confirmText: 'Confirm', type: 'warning', ...options }
  confirmVisible.value = true
  return new Promise((resolve) => {
    confirmResolve = resolve
  })
}

const resolveConfirm = (ok: boolean) => {
  confirmVisible.value = false
  confirmResolve?.(ok)
  confirmResolve = null
}

// ===== loading / 结果浮层（原型 confirm-loading） =====
type Indicator =
  | { mode: 'loading'; text: string }
  | { mode: 'result'; result: PanelResultOptions }

const indicator = ref<Indicator | null>(null)
let autoCloseTimer = 0

const showLoading = (text = 'Cancelling test…') => {
  clearTimeout(autoCloseTimer)
  indicator.value = { mode: 'loading', text }
}

const showResult = (options: PanelResultOptions) => {
  clearTimeout(autoCloseTimer)
  indicator.value = { mode: 'result', result: options }
  if (options.autoClose && options.autoClose > 0) {
    autoCloseTimer = window.setTimeout(() => {
      indicator.value = null
    }, options.autoClose)
  }
}

const hideIndicator = () => {
  clearTimeout(autoCloseTimer)
  indicator.value = null
}

const onResultAction = (action: string) => {
  const result = indicator.value?.mode === 'result' ? indicator.value.result : null
  hideIndicator()
  result?.onAction?.(action)
}

onUnmounted(() => {
  clearTimeout(autoCloseTimer)
  confirmResolve?.(false)
  confirmResolve = null
})

// ===== 键盘上下键滚动面板内部滚动条 =====
// 监听挂在外壳：show 为 defineModel（open()/close()/父级 v-model:show 均可驱动），
// watch(show) 统一管理监听的挂载与移除（显示时启用、隐藏时移除）；
// 各页签滚动容器不同（tabHost 列表 / tabTest 内容区 / tabQuery 结果区），
// 按键时实时探测 .panel-body 内第一个可滚动元素，无需各页签单独监听。
const panelBodyRef = ref<HTMLElement | null>(null)

/** 输入类元素不拦截方向键（避免干扰 textarea/input 内光标移动） */
const isEditableTarget = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'
}

/** 查找面板内容里第一个实际可滚动的容器（overflow-y 为 auto/scroll 且内容溢出） */
const findScrollContainer = (): HTMLElement | null => {
  const body = panelBodyRef.value
  if (!body) return null
  for (const el of Array.from(body.querySelectorAll<HTMLElement>('*'))) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el
  }
  return null
}

const onPanelKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  if (!show.value || isEditableTarget(e.target)) return
  const el = findScrollContainer()
  if (!el) return // 面板内部无滚动条时不拦截，页面滚动等默认行为不受影响
  e.preventDefault()
  e.stopPropagation()
  el.scrollTop += (e.key === 'ArrowDown' ? 1 : -1) * Math.round(el.clientHeight * 0.2)
}

watch(show, (v) => {
  if (v) {
    window.addEventListener('keydown', onPanelKeydown, true)
  } else {
    window.removeEventListener('keydown', onPanelKeydown, true)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onPanelKeydown, true)
})

// 提供给各页签的面板能力
provide(PANEL_API_KEY, {
  confirm,
  showLoading,
  showResult,
  hideIndicator,
} satisfies PanelApi)

defineExpose({
  open,
  close,
  setTab: switchTab,
  confirm,
  showLoading,
  showResult,
  hideIndicator,
})
</script>

<template>
  <aside
    class="cpu-copilot-panel"
    :class="{ 'is-open': show, 'is-left': position === 'left' }"
    :aria-hidden="String(!show)"
  >
    <header class="panel-header">
      <div class="panel-header-left">
        <div class="panel-header-icon">
          <img :src="imgLogo" alt="xCopilot" draggable="false" />
        </div>
        <h2>xCopilot Plugin</h2>
      </div>
      <span class="panel-header-user">{{ userHint || user }}</span>
      <button type="button" class="panel-close" aria-label="Close panel" @click="close"></button>
    </header>

    <div ref="panelBodyRef" class="panel-body">
      <nav class="tabs">
        <div class="tabs-inner" :data-active="activeTab">
          <button
            type="button"
            class="tab"
            :class="{ active: activeTab === 'occupied' }"
            @click="switchTab('occupied')"
          >My HOST <span class="tab-badge">{{ occupiedCount }}</span></button>
          <button
            type="button"
            class="tab"
            :class="{ active: activeTab === 'available' }"
            @click="switchTab('available')"
          >Let's Test</button>
          <button
            type="button"
            class="tab"
            :class="{ active: activeTab === 'query' }"
            @click="switchTab('query')"
          >Direct Mode</button>
        </div>
      </nav>

      <!-- 页签内容：切换即重建组件（与原型状态机复位行为一致；挂载时序保证顶栏联动文案正确） -->
      <TabHost
        v-if="activeTab === 'occupied'"
        @count-change="occupiedCount = $event"
        @release="(item) => emit('release', item)"
        @remote="(item) => emit('remote', item)"
      />
      <TabTest
        v-else-if="activeTab === 'available'"
        @user-hint="onUserHint"
        @tc-change="(tcId) => emit('tc-change', tcId)"
        @start-test="(host) => emit('start-test', host)"
        @remote="(host) => emit('remote', host)"
      />
      <TabQuery
        v-else
        @search="(requirement) => emit('search', requirement)"
        @host-open="(host) => emit('host-open', host)"
      />
    </div>

    <!-- 面板内确认弹窗 -->
    <div class="confirm-overlay" :class="{ 'is-open': confirmVisible }" @click="resolveConfirm(false)"></div>
    <div class="confirm-dialog" :class="{ 'is-open': confirmVisible }" role="dialog" aria-modal="true">
      <div class="confirm-title">{{ confirmOpts.title }}</div>
      <div class="confirm-message">{{ confirmOpts.message }}</div>
      <div class="confirm-icon" :class="{ 'is-info': confirmOpts.type === 'info' }">
        <img
          :src="confirmOpts.type === 'info' ? imgRemoteConnect : imgCancelTest"
          :alt="confirmOpts.type === 'info' ? 'Connect' : 'Warning'"
          draggable="false"
        />
      </div>
      <div class="confirm-actions">
        <button type="button" class="btn-cancel" @click="resolveConfirm(false)">Cancel</button>
        <button
          type="button"
          class="btn-confirm"
          :class="{ 'is-info': confirmOpts.type === 'info' }"
          @click="resolveConfirm(true)"
        >{{ confirmOpts.confirmText }}</button>
      </div>
    </div>

    <!-- loading / 结果浮层 -->
    <div v-if="indicator" class="confirm-loading">
      <template v-if="indicator.mode === 'loading'">
        <div class="confirm-spinner"></div>
        <span class="confirm-loading-text">{{ indicator.text }}</span>
      </template>
      <template v-else>
        <div class="confirm-result-title">{{ indicator.result.title }}</div>
        <div v-if="indicator.result.message" class="confirm-result-msg">{{ indicator.result.message }}</div>
        <div class="confirm-result-icon" :class="indicator.result.success ? 'is-success' : 'is-fail'">
          <img :src="indicator.result.success ? imgSuccess : imgFail" :alt="indicator.result.success ? 'Success' : 'Failed'" draggable="false" />
        </div>
        <div v-if="indicator.result.actions?.length" class="confirm-result-actions">
          <button
            v-for="act in indicator.result.actions"
            :key="act.action"
            type="button"
            class="result-btn"
            :class="act.style === 'cancel' ? 'btn-cancel' : 'btn-confirm'"
            @click="onResultAction(act.action)"
          >{{ act.text }}</button>
        </div>
      </template>
    </div>
  </aside>
</template>

<style lang="less" scoped>
/* ===== 弹窗容器（原型 .plugin-panel，vh 数值 1:1 还原） ===== */
.cpu-copilot-panel {
  position: fixed;
  right: 9.778vh;
  top: 50%;
  transform: translateY(-50%) scale(0.96);
  width: 53.333vh;
  height: 88vh;
  background: #ffffff;
  border-radius: 1.778vh;
  box-shadow: 0 4.267vh 8.533vh rgba(0, 0, 0, 0.28), 0 1.067vh 2.489vh rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.3s ease;
  /* 扩展宿主页面 z-index 基准与 main.vue 悬浮按钮一致 */
  z-index: 999999;
  overflow: hidden;
  border: 0.178vh solid rgba(0, 0, 0, 0.06);
  font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1f2937;
  -webkit-font-smoothing: antialiased;

  /* 停靠左侧：镜像到左边缘（与浮钮贴左时同侧） */
  &.is-left {
    right: auto;
    left: 9.778vh;
  }

  &.is-open {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) scale(1) translateX(0);
  }
}

/* ===== Panel Header ===== */
.panel-header {
  padding: 2.133vh 3.2vh;
  background: #c0daeb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 1.422vh;
}

.panel-header-icon {
  width: 3.556vh;
  height: 3.556vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }
}

.panel-header h2 {
  font-size: 1.849vh;
  font-weight: 700;
  color: #447dbc;
  margin: 0;
  line-height: 1;
  letter-spacing: 0.036vh;
  white-space: nowrap;
}

.panel-header-user {
  flex: 1;
  text-align: right;
  font-size: 1.12vh;
  font-weight: 400;
  color: #447dbc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1.422vh;
}

.panel-close {
  width: 3.556vh;
  height: 3.556vh;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  position: relative;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
  }

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 1.244vh;
    height: 0.249vh;
    background: #447dbc;
    border-radius: 0.178vh;
  }

  &::before {
    transform: rotate(45deg);
  }

  &::after {
    transform: rotate(-45deg);
  }
}

/* ===== Panel Body ===== */
.panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== Segmented Control（原型 .tabs / .tabs-inner） ===== */
.tabs {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  padding: 1.6vh 2.667vh;
  background: #ffffff;
}

.tabs-inner {
  display: flex;
  position: relative;
  background: #f0f2f5;
  border-radius: 1.067vh;
  padding: 0.356vh;
  width: 100%;

  /* 滑块 */
  &::before {
    content: '';
    position: absolute;
    top: 0.356vh;
    left: 0.356vh;
    width: calc(33.3333% - 0.356vh);
    height: calc(100% - 0.711vh);
    background: #ffffff;
    border-radius: 0.8vh;
    box-shadow: 0 0.267vh 0.889vh rgba(0, 0, 0, 0.08);
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 1;
  }

  &[data-active='available']::before {
    transform: translateX(100%);
  }

  &[data-active='query']::before {
    transform: translateX(200%);
  }
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.889vh;
  padding: 0.978vh 1.422vh;
  font-family: inherit;
  font-size: 1.476vh;
  font-weight: 600;
  color: #8b8f95;
  cursor: pointer;
  border: none;
  background: transparent;
  position: relative;
  z-index: 2;
  transition: color 0.3s ease;
  user-select: none;
  -webkit-user-select: none;

  &.active {
    color: #1a1d21;
  }

  &:hover:not(.active) {
    color: #5a5e64;
  }

  &:focus-visible {
    outline: 0.356vh solid #447dbc;
    outline-offset: -0.356vh;
    border-radius: 0.711vh;
  }
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.311vh;
  height: 2.311vh;
  padding: 0 0.711vh;
  font-size: 0.924vh;
  font-weight: 600;
  background: #e5e7eb;
  color: #6b7075;
  border-radius: 1.156vh;
  transition: background 0.3s ease, color 0.3s ease;

  .tab.active & {
    background: #447dbc;
    color: #ffffff;
  }
}

/* ===== 确认弹窗（原型 .confirm-overlay / .confirm-dialog） ===== */
.confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  z-index: 100;

  &.is-open {
    opacity: 1;
    visibility: visible;
  }
}

.confirm-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.92);
  width: 37.037vh;
  background: #ffffff;
  border-radius: 1.778vh;
  box-shadow: 0 3.556vh 8.889vh rgba(0, 0, 0, 0.3);
  padding: 2.667vh 4.978vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.067vh;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
  z-index: 101;
  text-align: center;

  &.is-open {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, -50%) scale(1);
  }
}

.confirm-icon {
  width: 19.067vh;
  background: transparent;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.667vh;
  font-weight: 700;
  color: #d4656a;

  img {
    width: 19.067vh;
    height: auto;
    object-fit: contain;
    pointer-events: none;
  }

  &.is-info {
    background: transparent;
    color: #447dbc;
  }
}

.confirm-title {
  font-size: 2.222vh;
  font-weight: 700;
  color: #1f2937;
}

.confirm-message {
  font-size: 1.476vh;
  color: #6b7280;
  line-height: 1.6;
}

.confirm-actions {
  margin-top: 2.667vh;
  display: flex;
  justify-content: center;
  gap: 1.778vh;
}

.btn-cancel {
  padding: 1.067vh 3.911vh;
  font-family: inherit;
  font-size: 1.476vh;
  font-weight: 600;
  border: 0.178vh solid #e5e7eb;
  border-radius: 0.889vh;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
}

.btn-confirm {
  padding: 1.067vh 3.911vh;
  font-family: inherit;
  font-size: 1.476vh;
  font-weight: 600;
  border: none;
  border-radius: 0.889vh;
  background: #d4656a;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(0.92);
  }

  /* info 类型：蓝色确认按钮（原型 openConfirm 内联样式） */
  &.is-info {
    background: #447dbc;
  }
}

/* ===== loading / 结果浮层（原型 .confirm-loading） ===== */
.confirm-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #ffffff;
  border-radius: 1.778vh;
  box-shadow: 0 3.556vh 8.889vh rgba(0, 0, 0, 0.3);
  padding: 2.667vh 4.978vh;
  z-index: 102;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.067vh;
  text-align: center;
  width: 37.037vh;
}

.confirm-spinner {
  width: 5.333vh;
  height: 5.333vh;
  border: 0.533vh solid #e3f0fa;
  border-top-color: #447dbc;
  border-radius: 50%;
  animation: cpu-confirm-spin 0.8s linear infinite;
}

.confirm-loading-text {
  font-size: 1.671vh;
  font-weight: 500;
  color: #1f2937;
}

/* 结果态（原型 .confirm-result-*） */
.confirm-result-icon {
  width: 19.067vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.667vh;
  font-weight: 700;

  img {
    width: 19.067vh;
    height: auto;
    object-fit: contain;
    display: block;
    pointer-events: none;
  }

  &.is-success {
    color: #1e9e56;
  }

  &.is-fail {
    color: #d4656a;
  }
}

.confirm-result-title {
  font-size: 2.222vh;
  font-weight: 700;
  color: #1f2937;
}

.confirm-result-msg {
  font-size: 1.476vh;
  color: #6b7280;
  line-height: 1.6;
  word-break: break-word;
}

.confirm-result-actions {
  margin-top: 2.667vh;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: 1.778vh;

  .result-btn {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}

@keyframes cpu-confirm-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
