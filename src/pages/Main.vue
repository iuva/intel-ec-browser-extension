<script setup lang="ts">
import FloatButton from "/@/components/floatButton.vue";
import Copilot from "/@/components/copilot/index.vue";
import { PANEL_VISIBILITY_KEY, type CopilotUserInfo } from "/@/components/copilot/context";
import { FLOAT_BUTTON_API_KEY, type FloatButtonApi } from "/@/components/floatButtonContext";
import {computed, onMounted, onUnmounted, provide, ref} from "vue";
import { watchTCID } from "/@/utils/tc";
import { getUserInfo, userAuth } from "/@/api/auth";
import browser from "webextension-polyfill";

/** FloatButton 暴露的 tooltip 能力；展示逻辑内聚在组件内部，这里仅负责接线 */
const floatButtonRef = ref<FloatButtonApi | null>(null)

provide(FLOAT_BUTTON_API_KEY, {
  updateTooltip: (text) => floatButtonRef.value?.updateTooltip(text),
  showTooltip: (duration, text, clearAfter) => floatButtonRef.value?.showTooltip(duration, text, clearAfter),
  resetTooltip: (waitForEnd, interrupt) => floatButtonRef.value?.resetTooltip(waitForEnd, interrupt),
})

const fbClick = (...args: any[]) => {
  console.log('fbClick', args)
  // copilotState.value.show = true
  toggleCopilot()
}

const fbDragEnd = (p: {x: number; y: number; side: 'left' | 'right'}): void => {
  console.log('fbDragEnd', p)
  copilotState.value.position = p.side
}

const copilotState = ref({
  position: 'right' as 'left' | 'right',
  show: false,
})
const copilotRef = ref<InstanceType<typeof Copilot> | null>(null)

/** 面板可见性：由组合根统一下发，供 Main 子树内组件按需 watch */
const panelVisible = computed(() => copilotState.value.show)

provide(PANEL_VISIBILITY_KEY, { visible: panelVisible })

/** 切换面板 */
const toggleCopilot = (): void => {
  copilotState.value.show = !copilotState.value.show
}

/** 快捷键切换面板：background 监听到 Alt+Shift+Z（macOS Command+Shift+Z）后转发到当前页面 */
const onShortcutMessage = (message: any): void => {
  if (message?.type === 'toggleCopilot') {
    toggleCopilot()
  }
}

/**
 * 页面内快捷键兜底：焦点在网页时直接响应。
 * 仅在浏览器未能成功注册 commands 快捷键时启用（地址栏焦点场景只能依靠 commands）。
 */
const onShortcutKeydown = (event: KeyboardEvent): void => {
  // code 基于物理按键，key 兜底非 QWERTY 布局；macOS 按住 Option 时 key 会变成特殊字符
  const isZ = event.code === 'KeyZ' || event.key?.toLowerCase() === 'z'
  if (!isZ || !event.shiftKey || !(event.altKey || event.metaKey)) return
  event.preventDefault()
  event.stopPropagation()
  toggleCopilot()
}

/** 是否已挂载页面 keydown 兜底监听 */
let keydownBound = false
/** 组件是否已卸载（异步查询快捷键期间可能发生卸载） */
let disposed = false

/**
 * commands 与页面 keydown 二选一：
 * 快捷键已被浏览器注册时只走 commands（避免同一次按键触发两次）；
 * 未注册（如组合键冲突）时才挂页面 keydown。
 */
const bindShortcutFallback = async (): Promise<void> => {
  let shortcut = ''
  try {
    const res = await browser.runtime.sendMessage({ type: 'getToggleShortcut' })
    shortcut = res?.shortcut || ''
  } catch {
    // 后台不可用时按未注册处理
  }
  // 已卸载或快捷键已注册：不挂页面监听
  if (disposed || shortcut) return
  window.addEventListener('keydown', onShortcutKeydown, true)
  keydownBound = true
}

  // 用户状态：0识别中，1用户信息获取失败，2用户信息获取成功
const userState = ref<0 | 1 | 2>(0)
/** 用户信息（获取成功后展示在面板顶栏） */
const user = ref('')
/** 登录用户完整信息（下发给 Copilot 页签调用接口） */
const userInfo = ref<CopilotUserInfo | null>(null)

// ===== TC_ID 监听（组件生效后立即开启） =====
const tcId = ref<string | null>(null)
let stopTcWatch: (() => void) | null = null

/** TC_ID 变化：非空时浮钮 tooltip 提示 3s，无选中 TC_ID 时立即清空 */
const onTcIdChange = (id: string | null) => {
  tcId.value = id
  const api = floatButtonRef.value
  if (!api) return
  if (id) {
    api.showTooltip(3000, `TC_ID detected: ${id}`, true)
  } else {
    api.resetTooltip(false, true)
  }
}

/** 用户信息请求序号：只接受最后一次请求的结果 */
let userSeq = 0

/** 获取用户信息：老版逻辑 HSDES 用户 → auth 登录换取 full_name / email；面板识别中/失败态的 Retry 均回调此方法 */
const loadUserInfo = async () => {
  const seq = ++userSeq
  userState.value = 0
  try {
    const userRes = await getUserInfo()
    const authRes = await userAuth(userRes.original_user)
    if (seq !== userSeq) return
    userInfo.value = { full_name: authRes.user.full_name, email: authRes.user.email }
    user.value = authRes.user.email || authRes.user.full_name
    userState.value = 2
  } catch {
    if (seq !== userSeq) return
    userInfo.value = null
    userState.value = 1
  }
}

onMounted(() => {
  loadUserInfo()
  bindShortcutFallback()
  browser.runtime.onMessage.addListener(onShortcutMessage)
  // immediate 默认 true：挂载即按当前页面状态回调一次
  stopTcWatch = watchTCID(onTcIdChange)
})

onUnmounted(() => {
  disposed = true
  userSeq++
  if (keydownBound) window.removeEventListener('keydown', onShortcutKeydown, true)
  browser.runtime.onMessage.removeListener(onShortcutMessage)
  stopTcWatch?.()
  stopTcWatch = null
})

</script>

<template>
  <div class="main-page">
    <FloatButton
      ref="floatButtonRef"
      @click="fbClick"
      @dragEnd="fbDragEnd"
    />

    <Copilot
        :position="copilotState.position"
        :user="user"
        :user-state="userState"
        :user-info="userInfo"
        :tc-id="tcId"
        v-model:show="copilotState.show"
        ref="copilotRef"
        @retry-user-info="loadUserInfo"

    />
  </div>

</template>

<style scoped lang="less">

</style>