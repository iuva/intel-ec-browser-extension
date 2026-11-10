<!-- tabHost.vue -->
<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import StateCard from './stateCard.vue'
import { PANEL_API_KEY, type CopilotOccupiedHost, type PanelApi } from './context'
import { imgNoHost, imgTimeout } from './images'

/**
 * 「My HOST」页签（原型 data-tab="occupied"）：
 * 已占用 HOST 任务卡片列表 + 取消测试 / Remote 操作。
 * 数据来自 getRetryList（游标分页 + 滚动到底自动加载）。
 */
type HostOccupyItem = CopilotOccupiedHost

const PAGE_SIZE = 50

const emit = defineEmits<{
  (e: 'count-change', count: number): void
}>()

const panel = inject<PanelApi | null>(PANEL_API_KEY, null)

const list = ref<HostOccupyItem[]>([])
const total = ref(0)
const nextCursor = ref<string | null>(null)
const state = ref<'loading' | 'list' | 'error'>('loading')
const loadingMore = ref(false)
const hasMore = computed(() => !!nextCursor.value && list.value.length < total.value)

let requestSeq = 0

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e || 'Unknown error'))

const fetchPage = async (cursor: string | null) => {
  const page = await panel?.fetchOccupiedHosts({ cursor, pageSize: PAGE_SIZE })
  if (!page) throw new Error('Panel API unavailable')
  return page
}

/** 重新加载第一页（首次进入 / 操作成功后刷新） */
const load = async () => {
  const seq = ++requestSeq
  state.value = 'loading'
  try {
    const page = await fetchPage(null)
    if (seq !== requestSeq) return
    list.value = page.list
    total.value = page.total
    nextCursor.value = page.next_cursor
    state.value = 'list'
  } catch {
    if (seq !== requestSeq) return
    list.value = []
    total.value = 0
    nextCursor.value = null
    state.value = 'error'
  }
}

/** 追加下一页；失败保留游标，下次滚动自动重试 */
const loadMore = async () => {
  if (!hasMore.value || loadingMore.value || state.value !== 'list') return
  const seq = requestSeq
  loadingMore.value = true
  try {
    const page = await fetchPage(nextCursor.value)
    if (seq !== requestSeq) return
    list.value.push(...page.list)
    total.value = page.total
    nextCursor.value = page.next_cursor
  } catch {
    // 保留游标，等待下次滚动重试
  } finally {
    if (seq === requestSeq) loadingMore.value = false
  }
}

const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollHeight - el.scrollTop - el.clientHeight <= 24) loadMore()
}

watch(total, (count) => emit('count-change', count), { immediate: true })

onMounted(load)
onUnmounted(() => {
  requestSeq++
})

/** 取消测试：确认 → 接口释放 → 成功刷新第一页 */
const onRelease = async (item: HostOccupyItem) => {
  const ok = await panel?.confirm({
    title: 'Cancel Test',
    message: `Cancel test task for "${item.host_name}"? The HOST occupancy will be released.`,
    confirmText: 'Confirm',
    type: 'warning',
  })
  if (!ok) return

  panel?.showLoading(`Cancelling test on "${item.host_name}"…`)
  try {
    await panel?.releaseHost(item)
    panel?.showResult({
      success: true,
      title: 'Test cancelled',
      message: `Occupancy on "${item.host_name}" has been released.`,
      autoClose: 4000,
    })
    await load()
  } catch (e) {
    panel?.showResult({
      success: false,
      title: 'Cancel failed',
      message: errorMessage(e),
      actions: [{ text: 'Close', action: 'close', style: 'cancel' }],
    })
  }
}

/** Remote：确认后建立连接并拉起 RealVNC */
const onRemote = async (item: HostOccupyItem) => {
  const ok = await panel?.confirm({
    title: 'Connect',
    message: `Connect to "${item.host_name}" via RealVNC?`,
    confirmText: 'Connect',
    type: 'info',
  })
  if (!ok) return

  panel?.showLoading(`Connecting to "${item.host_name}"…`)
  try {
    await panel?.connectHost({ hostId: item.host_id, hostRecId: item.host_rec_id, host: item.host_name })
    panel?.showResult({
      success: true,
      title: 'VNC connected',
      message: `RealVNC is connecting to "${item.host_name}".`,
      autoClose: 4000,
    })
  } catch (e) {
    panel?.showResult({
      success: false,
      title: 'Connect failed',
      message: errorMessage(e),
      actions: [{ text: 'Close', action: 'close', style: 'cancel' }],
    })
  }
}
</script>

<template>
  <div class="cpu-copilot-list-container" @scroll.passive="onScroll">
    <div v-if="state === 'loading'" class="host-loading">
      <div class="loading-spinner"></div>
      <span>Loading HOST list…</span>
    </div>
    <StateCard
      v-else-if="state === 'error'"
      :img="imgTimeout"
      title="Load failed"
      reason="HOST list API (retry-vnc) failed"
      btn-text="Retry"
      @action="load"
    />
    <template v-else-if="list.length > 0">
      <div v-for="item in list" :key="item.host_id" class="cpu-task-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-tcid">TC_ID: {{ item.tc_id || '--' }}</span>
          </div>
          <span class="card-status">{{ item.status }}</span>
        </div>
        <div class="card-main">
          <div class="card-body">
            <div class="card-field">
              <span class="card-field-label">Host Name</span>
              <span class="card-field-value">{{ item.host_name }}</span>
            </div>
            <div class="card-field">
              <span class="card-field-label">Used Time</span>
              <span class="card-field-value">{{ item.occupy_time || '--' }}</span>
            </div>
            <div class="card-field">
              <span class="card-field-label">Last Time</span>
              <span class="card-field-value">{{ item.last_time || '--' }}</span>
            </div>
            <div class="card-field">
              <span class="card-field-label">Occupy Dur</span>
              <span class="card-field-value is-warning">{{ item.occupy_duration || '--' }}</span>
            </div>
          </div>
          <div class="card-footer">
            <button type="button" class="btn btn-release" @click="onRelease(item)">Cancel Test</button>
            <button type="button" class="btn btn-resume" @click="onRemote(item)">Remote</button>
          </div>
        </div>
      </div>
      <div v-if="loadingMore || !hasMore" class="list-footer">
        <template v-if="loadingMore">
          <span class="footer-spinner"></span>
          <span>Loading more…</span>
        </template>
        <template v-else>All HOSTs loaded</template>
      </div>
    </template>
    <StateCard
      v-else
      :img="imgNoHost"
      title="No HOST occupied"
      reason="Pick a HOST in [Let's Test]"
    />
  </div>
</template>

<style lang="less" scoped>
/* ===== 卡片列表（原型 .list-container） ===== */
.cpu-copilot-list-container {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 1.422vh 2.133vh;
  display: flex;
  flex-direction: column;
  gap: 1.422vh;
  background: #fafbfc;

  &::-webkit-scrollbar {
    width: 0.711vh;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 0.356vh;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
}

/* ===== 首屏 loading / 滚动加载状态 ===== */
.host-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.422vh;
  color: #6b7280;
  font-size: 1.298vh;
}

.loading-spinner {
  width: 3.2vh;
  height: 3.2vh;
  border: 0.356vh solid #e5e9ef;
  border-top-color: #447dbc;
  border-radius: 50%;
  animation: cpu-spin 0.8s linear infinite;
}

.list-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.711vh;
  padding: 1.067vh 0 0.356vh;
  color: #9ca3af;
  font-size: 1.12vh;
}

.footer-spinner {
  width: 1.6vh;
  height: 1.6vh;
  border: 0.178vh solid #e5e9ef;
  border-top-color: #447dbc;
  border-radius: 50%;
  animation: cpu-spin 0.8s linear infinite;
}

@keyframes cpu-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 任务卡片（原型 .task-card，0.711vh 基准栅格） ===== */
.cpu-task-card {
  background: #ffffff;
  border: 0.178vh solid #e8ecf1;
  border-radius: 1.422vh;
  padding: 2.133vh;
  box-shadow: 0 0.178vh 0.711vh rgba(0, 0, 0, 0.03), 0 0.711vh 2.133vh rgba(131, 193, 232, 0.06);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 0.356vh 1.422vh rgba(0, 0, 0, 0.05), 0 1.422vh 3.556vh rgba(131, 193, 232, 0.1);
    border-color: #c0daeb;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1.422vh;
    margin-bottom: 1.422vh;
    border-bottom: 0.107vh solid #f0f2f5;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 1.067vh;
  }

  .card-tcid {
    display: inline-flex;
    align-items: center;
    font-size: 1.298vh;
    font-weight: 600;
    color: #447dbc;
    background: #eff5fb;
    padding: 0.356vh 1.067vh;
    border-radius: 0.533vh;
    letter-spacing: 0.071vh;
    font-variant-numeric: tabular-nums;
  }

  /* 状态胶囊（原型 .card-status） */
  .card-status {
    display: inline-flex;
    align-items: center;
    gap: 0.533vh;
    font-size: 1.12vh;
    font-weight: 500;
    color: #447dbc;
    background: #eff5fb;
    border: none;
    padding: 0.356vh 1.067vh;
    border-radius: 3.556vh;
    line-height: 1;

    &::before {
      content: '';
      width: 0.622vh;
      height: 0.622vh;
      background: #447dbc;
      border-radius: 50%;
      animation: cpu-status-pulse 2s ease-in-out infinite;
    }
  }

  .card-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
  }

  .card-field {
    display: flex;
    flex-direction: row;
    align-items: center;
    min-height: 2.489vh;
    padding: 0.267vh 0;
  }

  .card-field-label {
    font-size: 1.298vh;
    font-weight: 500;
    color: #9ca3af;
    flex-shrink: 0;
    width: 9.778vh;

    &::after {
      content: '：';
    }
  }

  .card-field-value {
    font-size: 1.476vh;
    font-weight: 600;
    color: #1a1d21;
    font-variant-numeric: tabular-nums;
    line-height: 1;

    &.is-warning {
      color: #e07a5f;
    }
  }

  .card-footer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    gap: 1.067vh;
    padding-left: 2.133vh;
    flex-shrink: 0;

    .btn {
      min-width: 8.889vh;
    }
  }
}

/* ===== 操作按钮（原型 .btn / .btn-release / .btn-resume） ===== */
.btn {
  padding: 0.889vh 1.778vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 600;
  border: none;
  border-radius: 0.711vh;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.036vh;
  line-height: 1;

  &:focus-visible {
    outline: 0.356vh solid #447dbc;
    outline-offset: 0.178vh;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.btn-release {
  background: #f8edef;
  color: #c0625a;

  &:hover {
    background: #f0d4d2;
    color: #a54a42;
  }
}

.btn-resume {
  background: #447dbc;
  color: #ffffff;

  &:hover {
    background: #3a6aa5;
    box-shadow: 0 0.356vh 1.067vh rgba(68, 125, 188, 0.25);
  }
}

@keyframes cpu-status-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}
</style>
