<!-- floatButton.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
// 默认图标：原型悬浮按钮 logo（已复制至 src/img/logo.png，构建时内联为 data URL）
import defaultIcon from '/@/img/logo.png'

/**
 * 悬浮圆形按钮（样式还原自 prototype/browser-plugin-prototype.html 的 .float-button）
 *
 * 拖拽实现：pointer events + setPointerCapture，拖拽过程中仅通过 rAF 合帧写
 * translate3d（合成器动画，不触发 layout/paint），松手后使用 CSS 贝塞尔曲线
 * 过渡完成左右吸附，全程无布局抖动，拖拽与吸附丝滑。
 *
 * 入参（props）：
 * - tooltip   tooltip 文本内容（悬浮在按钮背对屏幕边缘的一侧）
 * - icon      按钮图标图片地址（对应原型 logo）
 * - onClick   点击回调（拖拽位移超过容差后松手不会触发 click）
 * - onDrag    拖拽回调，拖拽过程中每帧回调 { x, y, side }
 * - onDragEnd 拖拽结束回调，松手后回调吸附结果 { x, y, side }
 *
 * 使用示例：
 * <FloatButton
 *   tooltip="Open panel"
 *   icon="/@/img/logo.png"
 *   :on-click="openPanel"
 *   :on-drag="onDragging"
 *   :on-drag-end="onDragStop"
 * />
 */
interface FloatButtonPosition {
  x: number
  y: number
  side: 'left' | 'right'
}

const props = withDefaults(defineProps<{
  tooltip?: string
  icon?: string
  onClick?: (event: MouseEvent) => void
  onDrag?: (position: FloatButtonPosition) => void
  onDragEnd?: (position: FloatButtonPosition) => void
}>(), {
  tooltip: '',
  icon: defaultIcon,
  onClick: undefined,
  onDrag: undefined,
  onDragEnd: undefined,
})

/** 拖拽容差（px）：位移未超过容差视为点击抖动 */
const DRAG_TOLERANCE = 6
/** 吸附动画时长（ms） */
const SNAP_DURATION = 360
/** 吸附曲线：快速启动 + 柔和减速 */
const SNAP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const btnEl = ref<HTMLButtonElement | null>(null)
/** 是否正在拖拽（仅用于切换 class，不参与高频渲染） */
const dragging = ref(false)
/** 当前贴边侧（决定 tooltip 弹出方向） */
const side = ref<'left' | 'right'>('right')

// ===== 非响应式拖拽状态（热路径完全绕开 Vue 响应式系统） =====
let x = 0                 // 当前位置 x（px）
let y = 0                 // 当前位置 y（px）
let width = 0             // 按钮宽（px）
let height = 0            // 按钮高（px）
let pointerId = -1        // 当前跟踪的指针
let startX = 0            // 按下点
let startY = 0
let baseX = 0             // 按下时按钮位置
let baseY = 0
let moved = false         // 是否已超过拖拽容差
let frame = 0             // 本帧 rAF 句柄（保证每帧最多一次写入）
let pendingX = 0          // 待写入位置
let pendingY = 0
let snapTimer = 0         // 吸附过渡清理定时器

/** 边缘间距，对应原型 right: 0.889vh */
const edgeGap = (): number => window.innerHeight * 0.889 / 100

const clampX = (value: number): number => {
  const gap = edgeGap()
  return Math.min(Math.max(value, gap), window.innerWidth - width - gap)
}

const clampY = (value: number): number => {
  const gap = edgeGap()
  return Math.min(Math.max(value, gap), window.innerHeight - height - gap)
}

const transformOf = (px: number, py: number): string =>
  `translate3d(${px}px, ${py}px, 0) scale(var(--fb-scale, 1))`

/** 以按钮中心点判断应吸附的侧边 */
const sideOf = (): 'left' | 'right' =>
  x + width / 2 <= window.innerWidth / 2 ? 'left' : 'right'

/** 写入 transform（合成器动画，不触发 layout） */
const applyTransform = (): void => {
  const el = btnEl.value
  if (!el) return
  el.style.transform = transformOf(x, y)
}

/**
 * 读取当前视觉位置（width/height 同时刷新）。
 * 通过 rect 反推未缩放左上角，处理 hover 放大与吸附动画中途接管的情况。
 */
const readVisualPosition = (): void => {
  const el = btnEl.value
  if (!el) return
  width = el.offsetWidth
  height = el.offsetHeight
  const rect = el.getBoundingClientRect()
  x = rect.left + (rect.width - width) / 2
  y = rect.top + (rect.height - height) / 2
}

/** 立即写入位置（无过渡），双 rAF 后恢复过渡，避免挂载/resize 时产生飞入动画 */
const writeInstant = (): void => {
  const el = btnEl.value
  if (!el) return
  el.style.transition = 'none'
  applyTransform()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const btn = btnEl.value
      if (btn && !dragging.value) btn.style.transition = ''
    })
  })
}

// ===== 拖拽引擎 =====

const onPointerDown = (event: PointerEvent): void => {
  const el = btnEl.value
  if (!el || pointerId !== -1 || !event.isPrimary) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  pointerId = event.pointerId
  moved = false
  startX = event.clientX
  startY = event.clientY

  // 若在吸附动画进行中被抓住：改写为当前视觉位置即可冻结吸附（此时保留过渡，
  // 让"拖拽恢复未悬停大小"的缩放平滑进行）
  readVisualPosition()
  baseX = x
  baseY = y
  applyTransform()

  // 指针捕获：后续 move/up 全部派发到按钮上，无需挂 document 监听
  // （极少数情况下指针已失效会抛异常，捕获失败不影响拖拽主流程）
  try {
    el.setPointerCapture(pointerId)
  } catch {
    /* ignore */
  }
  dragging.value = true
}

const flushFrame = (): void => {
  frame = 0
  x = pendingX
  y = pendingY
  applyTransform()
  props.onDrag?.({ x, y, side: sideOf() })
}

const onPointerMove = (event: PointerEvent): void => {
  if (pointerId === -1 || event.pointerId !== pointerId) return

  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (!moved) {
    if (Math.abs(dx) <= DRAG_TOLERANCE && Math.abs(dy) <= DRAG_TOLERANCE) return
    moved = true
    // 进入实际拖拽：此刻才关闭过渡，保证逐帧位置写入即时生效
    // （按下后未超容差前保留过渡，缩放恢复动画得以平滑完成）
    const el = btnEl.value
    if (el) el.style.transition = 'none'
  }

  // 全屏拖拽：仅边界夹取保证按钮完整可见，上下不做吸附
  pendingX = clampX(baseX + dx)
  pendingY = clampY(baseY + dy)
  if (!frame) frame = requestAnimationFrame(flushFrame)
}

/** 吸附到更近的左右边缘（上下不做吸附，保持当前位置） */
const performSnap = (): void => {
  const el = btnEl.value
  if (!el) return
  const targetSide = sideOf()
  const gap = edgeGap()
  x = targetSide === 'left' ? gap : window.innerWidth - width - gap
  y = clampY(y)
  side.value = targetSide

  // 吸附动画：内联 transition 覆盖默认值，动画结束后清理还原 hover 表现
  el.style.transition = `transform ${SNAP_DURATION}ms ${SNAP_EASING}, box-shadow 0.2s ease`
  applyTransform()
  clearTimeout(snapTimer)
  snapTimer = window.setTimeout(() => {
    const btn = btnEl.value
    if (btn && !dragging.value) btn.style.transition = ''
  }, SNAP_DURATION + 60)
}

const endDrag = (event: PointerEvent): void => {
  if (pointerId === -1 || event.pointerId !== pointerId) return
  pointerId = -1
  dragging.value = false
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
  const el = btnEl.value
  if (!el) return

  if (!moved) {
    // 未发生拖拽：若按钮已贴边（普通点击）则还原过渡交给原生 click 处理；
    // 若是抓住吸附动画中途松手（位置偏离边缘），则继续吸附归位
    const gap = edgeGap()
    const atEdge =
      Math.abs(x - gap) < 2 ||
      Math.abs(x - (window.innerWidth - width - gap)) < 2
    if (atEdge) {
      el.style.transition = ''
    } else {
      performSnap()
    }
    return
  }

  performSnap()
  props.onDragEnd?.({ x, y, side: side.value })
}

const handleClick = (event: MouseEvent): void => {
  // 抑制真实拖拽后松手触发的 click（detail > 0 为指针点击，键盘/程序触发 detail 为 0 不抑制）
  if (moved && event.detail > 0) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  props.onClick?.(event)
}

/** 窗口尺寸变化：贴回原侧边并夹取到可视范围内 */
const handleResize = (): void => {
  if (dragging.value || pointerId !== -1) return
  readVisualPosition()
  x = side.value === 'left' ? edgeGap() : window.innerWidth - width - edgeGap()
  y = clampY(y)
  writeInstant()
}

onMounted(() => {
  const el = btnEl.value
  if (!el) return
  // 初始位置由 CSS（right: 0.889vh; top: 50%）提供，读取后切换为 transform 驱动，首帧无闪烁
  readVisualPosition()
  side.value = sideOf()
  el.style.left = '0'
  el.style.top = '0'
  el.style.right = 'auto'
  writeInstant()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (frame) cancelAnimationFrame(frame)
  clearTimeout(snapTimer)
})
</script>

<template>
  <button
    ref="btnEl"
    type="button"
    class="cpu-float-button"
    :class="{ 'is-dragging': dragging, 'is-left': side === 'left' }"
    :aria-label="tooltip || 'float button'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @click="handleClick"
  >
    <span class="cpu-float-button-inner">
      <img v-if="icon" :src="icon" :alt="tooltip" draggable="false" />
    </span>
    <span v-if="tooltip" class="cpu-float-button-tooltip">{{ tooltip }}</span>
  </button>
</template>

<style lang="less" scoped>
/* ===== 悬浮圆形按键（数值还原原型 vh 单位） ===== */
.cpu-float-button {
  /* hover 放大系数：并入 transform 合成，避免 transform 被内联样式覆盖 */
  --fb-scale: 1;

  position: fixed;
  right: 0.889vh;
  top: 50%;
  /* 初始渲染（JS 接管前）按原型垂直居中；接管后由 translate3d 全量驱动 */
  transform: translateY(-50%);
  width: 8.533vh;
  height: 8.533vh;
  border-radius: 50%;
  background: #ffffff;
  border: 0.533vh solid #ffffff;
  box-shadow: 0 1.067vh 2.667vh rgba(0, 0, 0, 0.2), 0 0.356vh 0.889vh rgba(0, 0, 0, 0.15);
  z-index: 50;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  appearance: none;
  outline: none;
  transform-origin: center;
  /* 拖拽期间指针不触发页面滚动/选中 */
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;

  /* 悬停态：放大 + 阴影增强（加 :not(.is-dragging)：拖拽中鼠标必然压在按钮上，
     若不排除，:hover 会一直生效与拖拽态打架） */
  &:not(.is-dragging):hover {
    --fb-scale: 1.08;
    box-shadow: 0 1.422vh 3.556vh rgba(0, 0, 0, 0.25), 0 0.533vh 1.422vh rgba(0, 0, 0, 0.2);
  }

  &:focus-visible {
    outline: 0.356vh solid #447dbc;
    outline-offset: 0.356vh;
  }

  &.is-dragging {
    /* 拖拽中：恢复为鼠标移入前的大小（覆盖 hover 放大），并关闭 transform
       过渡保证逐帧位置写入即时生效 */
    --fb-scale: 1;
    transition: box-shadow 0.2s ease;
    cursor: grabbing;

    .cpu-float-button-tooltip {
      opacity: 0;
      /* 拖拽开始立即隐藏，不做淡出 */
      transition: none;
    }
  }

  .cpu-float-button-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: inset 0 0.133vh 0.267vh rgba(0, 0, 0, 0.18), inset 0 -0.067vh 0.133vh rgba(0, 0, 0, 0.09);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      width: 60%;
      height: 60%;
      object-fit: contain;
      object-position: center;
      display: block;
      pointer-events: none;
    }
  }

  .cpu-float-button-tooltip {
    position: absolute;
    right: calc(100% + 1.422vh);
    top: 50%;
    transform: translateY(-50%);
    background: #1f2937;
    color: #ffffff;
    font-family: "PingFang SC", "Microsoft YaHei", -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 1.298vh;
    font-weight: 500;
    padding: 0.711vh 1.422vh;
    border-radius: 0.711vh;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;

    &::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border: 0.711vh solid transparent;
      border-left-color: #1f2937;
    }
  }

  /* 贴左边缘时 tooltip 翻转到按钮右侧 */
  &.is-left .cpu-float-button-tooltip {
    right: auto;
    left: calc(100% + 1.422vh);

    &::after {
      left: auto;
      right: 100%;
      border-left-color: transparent;
      border-right-color: #1f2937;
    }
  }

  /* 仅未拖拽时悬停才显示 tooltip（拖拽中 :hover 必然命中，必须排除，
     否则该规则会覆盖 .is-dragging 里的 opacity: 0） */
  &:not(.is-dragging):hover .cpu-float-button-tooltip {
    opacity: 1;
  }
}
</style>
