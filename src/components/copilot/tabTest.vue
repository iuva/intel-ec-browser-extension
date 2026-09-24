<!-- tabTest.vue -->
<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import StateCard from './stateCard.vue'
import { PANEL_API_KEY, type PanelApi } from './context'
import { imgSearchAvatar, imgTcNotDetected, imgNoUser, imgTimeout, imgNoMatch } from './images'

/**
 * 「Let's Test」页签（原型 data-tab="available"）状态机：
 * idle 等待选中 TC_ID → selected 加载成功 / loading 加载中 / timeout 加载失败 / no-match 无匹配
 * → tc-not-detected TC_ID 未检测到 / no-user 用户信息获取失败。
 *
 * 回调事件：
 * - user-hint 顶栏用户文案联动（idle/no-user 态提示，其余态回传 null 还原用户邮箱）
 * - tc-change 选中 TC_ID 变化（业务接入点）
 * - start-test Start Test 确认后触发（业务接入点）
 * - remote Remote 确认后触发（业务接入点）
 */
export interface TestHostItem {
  host: string
  status: 'Free' | 'Occupied' | 'Running' | 'Offline'
  occupyTime?: string
  occupier?: string
  duration?: string
}

const emit = defineEmits<{
  (e: 'user-hint', hint: string | null): void
  (e: 'tc-change', tcId: string | null): void
  (e: 'start-test', host: TestHostItem): void
  (e: 'remote', host: TestHostItem): void
}>()

const panel = inject<PanelApi | null>(PANEL_API_KEY, null)

type TestState = 'idle' | 'selected' | 'loading' | 'timeout' | 'no-match' | 'tc-not-detected' | 'no-user'

/** 原型演示数据（tcList / testHostsData） */
const DEMO_TC_ID = '15014591568'
const demoHosts: TestHostItem[] = [
  { host: 'jwan150-mobl', status: 'Occupied', occupyTime: '2026-08-25 09:12', occupier: 'zhang.wei@intel.com', duration: '2h 30m' },
  { host: 'jwan151-mobl', status: 'Free' },
  { host: 'jwan152-mobl', status: 'Running', occupyTime: '2026-08-25 08:00', occupier: 'li.na@intel.com', duration: '3h 42m' },
  { host: 'jwan153-mobl', status: 'Free' },
  { host: 'jwan154-mobl', status: 'Occupied', occupyTime: '2026-08-24 20:15', occupier: 'wang.fang@intel.com', duration: '15h 27m' },
  { host: 'jwan155-mobl', status: 'Offline' },
  { host: 'jwan156-mobl', status: 'Free' },
]

const state = ref<TestState>('idle')
const selectedTcId = ref<string | null>(null)
const hosts = ref<TestHostItem[]>([])

/** 搜索条件（原型 hostQuery） */
const searchName = ref('')
const searchStatus = ref<'all' | TestHostItem['status']>('all')
/** 搜索刷新中的 loading（仅列表区域，demoState 不变） */
const searching = ref(false)

const STATUS_OPTIONS: Array<{ value: 'all' | TestHostItem['status']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'Free', label: 'Free' },
  { value: 'Occupied', label: 'Occupied' },
  { value: 'Running', label: 'Running' },
  { value: 'Offline', label: 'Offline' },
]

/** 状态统计（仅 selected 态展示，原型 buildSelectedLayout） */
const stats = computed(() => {
  const s = { Free: 0, Occupied: 0, Running: 0, Offline: 0 }
  hosts.value.forEach((h) => {
    if (h.status in s) s[h.status]++
  })
  return s
})

/** 过滤后的 HOST 列表（原型 getFilteredHosts） */
const filteredHosts = computed(() => {
  const kw = searchName.value.trim().toLowerCase()
  return hosts.value.filter((h) => {
    const nameOk = !kw || h.host.toLowerCase().includes(kw)
    const statusOk = searchStatus.value === 'all' || h.status === searchStatus.value
    return nameOk && statusOk
  })
})

const setUserHint = (hint: string | null) => emit('user-hint', hint)

/** 原型 setDemoState：携带选中 tc 的状态集群 */
const setState = (next: TestState) => {
  state.value = next
  const checkedStates: TestState[] = ['selected', 'loading', 'timeout', 'no-match']
  if (checkedStates.includes(next)) {
    selectedTcId.value = DEMO_TC_ID
  } else if (next === 'idle') {
    selectedTcId.value = null
  }
  setUserHint(next === 'no-user'
    ? 'User info unreadable · click to Retry'
    : next === 'idle'
      ? 'Loading user info …'
      : null)
}

onMounted(() => setState('idle'))

/** 原型 demo：进入已选中态（真实场景由 TC_ID 检测驱动，此处作为 Retry 入口） */
const loadHostList = (tcId: string) => {
  hosts.value = demoHosts
  selectedTcId.value = tcId
  emit('tc-change', tcId)
  setState('loading')
  window.setTimeout(() => setState('selected'), 1500)
}

const retryLoad = () => {
  setState('loading')
  window.setTimeout(() => setState('selected'), 1500)
}

const retrySearchTc = () => setState('idle')
const retryUser = () => setState('idle')

/** 搜索（原型 applyQuery）：列表区域 loading 1.5s 后刷新结果 */
const applyQuery = () => {
  searching.value = true
  window.setTimeout(() => {
    searching.value = false
  }, 1500)
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const formatNow = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Start Test（原型 bindOccupyButtons）：确认后占用 HOST 并刷新列表 */
const onStartTest = async (host: TestHostItem) => {
  const ok = await panel?.confirm({
    title: 'Start Test',
    message: `Start test on "${host.host}"? It will be occupied for the current test task.`,
    confirmText: 'Start',
    type: 'info',
  })
  if (!ok) return
  host.status = 'Occupied'
  host.occupyTime = formatNow()
  host.occupier = 'me@intel.com'
  host.duration = '0h 0m'
  emit('start-test', host)
}

/** Remote（原型 bindRemoteButtons） */
const onRemote = async (host: TestHostItem) => {
  const ok = await panel?.confirm({
    title: 'Connect',
    message: `Connect to "${host.host}" via RealVNC?`,
    confirmText: 'Connect',
    type: 'info',
  })
  if (ok) emit('remote', host)
}

/**
 * 状态机控制（预留业务接入）：
 * - setState(next) 直接切换状态
 * - loadHostList(tcId) 以指定 TC_ID 进入「加载中 → 列表」流程
 * 真实场景：由 TC_ID / 用户信息检测驱动，替代原型左侧调试面板。
 */
defineExpose({
  setState,
  loadHostList,
})
</script>

<template>
  <div class="cpu-copilot-test-layout">
    <div class="test-content">
      <!-- 状态1：等待识别用户信息与 TC_ID -->
      <StateCard
        v-if="state === 'idle'"
        :img="imgSearchAvatar"
        title="Loading user info & TC_ID"
        reason="Select a TC_ID in PHOENIX to load its HOST list"
        scan
      />

      <!-- 状态6：TC_ID 未检测到 -->
      <StateCard
        v-else-if="state === 'tc-not-detected'"
        :img="imgTcNotDetected"
        title="TC not detected"
        reason="No checked TC_ID found. Refresh to re-check, or switch to [Query] to find HOSTs"
        btn-text="Retry"
        @action="retrySearchTc"
      />

      <!-- 状态7：用户信息获取失败 -->
      <StateCard
        v-else-if="state === 'no-user'"
        :img="imgNoUser"
        title="Could not get user info"
        reason="Auth API failed, or no user info from PHOENIX"
        btn-text="Retry"
        @action="retryUser"
      />

      <!-- 已选中 TC_ID：banner + 搜索区 + 列表（状态2/3/4/5 共用布局） -->
      <template v-else>
        <div class="test-tcid-banner">
          <div class="test-tcid-text">
            Selected TC_ID: <span class="tcid-highlight">{{ selectedTcId }}</span>
          </div>
          <div v-if="state === 'selected'" class="test-tcid-stats">
            <div class="test-tcid-stat-item">
              <span class="test-tcid-stat-dot is-free"></span>
              <span class="test-tcid-stat-label">FREE</span>
              <span class="test-tcid-stat-count">{{ stats.Free }}</span>
            </div>
            <div class="test-tcid-stat-item">
              <span class="test-tcid-stat-dot is-occupied"></span>
              <span class="test-tcid-stat-label">OCC</span>
              <span class="test-tcid-stat-count">{{ stats.Occupied }}</span>
            </div>
            <div class="test-tcid-stat-item">
              <span class="test-tcid-stat-dot is-running"></span>
              <span class="test-tcid-stat-label">RUN</span>
              <span class="test-tcid-stat-count">{{ stats.Running }}</span>
            </div>
            <div class="test-tcid-stat-item">
              <span class="test-tcid-stat-dot is-offline"></span>
              <span class="test-tcid-stat-label">OFF</span>
              <span class="test-tcid-stat-count">{{ stats.Offline }}</span>
            </div>
          </div>
        </div>

        <div class="test-search-area">
          <input
            v-model="searchName"
            class="test-search-input"
            type="text"
            placeholder="Enter HOST name"
            @keydown.enter="applyQuery"
          />
          <select v-model="searchStatus" class="test-search-select">
            <option
              v-for="opt in STATUS_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
          <button type="button" class="test-search-btn" @click="applyQuery">Search</button>
        </div>

        <div class="test-host-list">
          <!-- 状态4：加载失败 -->
          <StateCard
            v-if="state === 'timeout'"
            :img="imgTimeout"
            title="Load failed"
            reason="HOST list API (GET /api/test/hosts) timed out or errored. Check network & retry"
            btn-text="Retry"
            @action="retryLoad"
          />

          <!-- 状态5：无匹配 -->
          <StateCard
            v-else-if="state === 'no-match'"
            :img="imgNoMatch"
            title="No matching HOST"
            reason="No available HOST under this TC_ID matches"
          />

          <!-- 列表 loading（demoState=loading 或搜索刷新中） -->
          <div v-else-if="state === 'loading' || searching" class="test-loading-spinner">
            <div class="spinner-ring"></div>
            <div class="test-loading-text">Loading HOST list…</div>
          </div>

          <!-- 状态3：HOST 列表 -->
          <template v-else>
            <StateCard
              v-if="filteredHosts.length === 0"
              :img="imgNoMatch"
              title="No matching HOST"
              reason="No available HOST under this TC_ID matches"
            />
            <div
              v-for="host in filteredHosts"
              :key="host.host"
              class="test-host-card"
            >
              <div class="test-host-card-header">
                <span class="test-host-name">{{ host.host }}</span>
                <span class="test-host-status" :class="`is-${host.status.toLowerCase()}`">{{ host.status }}</span>
              </div>
              <div class="test-host-fields">
                <div class="test-host-field">
                  <span class="test-host-field-label">Used By </span>
                  <span class="test-host-field-value">{{ host.status === 'Offline' ? '--' : (host.occupier || 'You can use this HOST') }}</span>
                </div>
                <div class="test-host-field">
                  <span class="test-host-field-label">Used Time</span>
                  <span class="test-host-field-value">{{ host.occupyTime || '--' }}</span>
                </div>
                <div class="test-host-field">
                  <span class="test-host-field-label">Occupy Dur</span>
                  <span class="test-host-field-value">{{ host.duration || '--' }}</span>
                </div>
              </div>
              <!-- 演示 HOST（jwan152-mobl）：Remote 按钮 -->
              <div v-if="host.host === 'jwan152-mobl'" class="test-host-footer">
                <button type="button" class="btn-remote" @click="onRemote(host)">Remote</button>
              </div>
              <!-- Free/Offline：Start Test 按钮（Offline 禁用） -->
              <div
                v-else-if="host.status === 'Free' || host.status === 'Offline'"
                class="test-host-footer"
              >
                <button
                  type="button"
                  class="btn-occupy"
                  :disabled="host.status === 'Offline'"
                  :title="host.status === 'Offline' ? 'HOST offline — cannot start' : undefined"
                  @click="onStartTest(host)"
                >Start Test</button>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="less" scoped>
/* ===== 我要去测试 Tab 布局（原型 .test-layout / .test-content） ===== */
.cpu-copilot-test-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.test-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 区域1：TC_ID banner */
.test-tcid-banner {
  padding: 1.244vh 1.778vh;
  background: linear-gradient(135deg, #eff5fb 0%, #f7fafd 100%);
  border-bottom: 0.107vh solid #d6e8f5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.test-tcid-text {
  font-size: 1.298vh;
  font-weight: 600;
  color: #447dbc;
  line-height: 1.4;
}

.tcid-highlight {
  display: inline-block;
  background: #447dbc;
  color: #fff;
  padding: 0.178vh 0.889vh;
  border-radius: 0.444vh;
  font-variant-numeric: tabular-nums;
  margin-left: 0.533vh;
}

.test-tcid-stats {
  display: flex;
  gap: 1.067vh;
  font-size: 1.12vh;
  font-weight: 500;
}

.test-tcid-stat-item {
  display: flex;
  align-items: center;
  gap: 0.356vh;
}

.test-tcid-stat-dot {
  width: 0.711vh;
  height: 0.711vh;
  border-radius: 50%;

  &.is-free {
    background: #10b981;
  }
  &.is-occupied {
    background: #f59e0b;
  }
  &.is-running {
    background: #3b82f6;
  }
  &.is-offline {
    background: #9ca3af;
  }
}

.test-tcid-stat-label {
  color: #6b7280;
}

.test-tcid-stat-count {
  color: #1f2937;
  font-weight: 600;
}

/* 区域2：搜索区 */
.test-search-area {
  padding: 1.422vh 1.778vh;
  display: flex;
  align-items: center;
  gap: 1.067vh;
  border-bottom: 0.107vh solid #e5e7eb;
  background: #ffffff;
  flex-shrink: 0;
}

.test-search-input {
  flex: 1;
  min-width: 0;
  height: 3.556vh;
  padding: 0 1.244vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 400;
  color: #1f2937;
  border: 0.178vh solid #d1d5db;
  border-radius: 0.711vh;
  outline: none;
  transition: border-color 0.2s;
  background: #fafbfc;

  &::placeholder {
    color: #b0b4ba;
  }

  &:focus {
    border-color: #83c1e8;
    background: #ffffff;
  }
}

.test-search-select {
  height: 3.556vh;
  padding: 0 3.2vh 0 1.244vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 500;
  color: #1f2937;
  border: 0.178vh solid #d1d5db;
  border-radius: 0.711vh;
  background: #fafbfc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239CA3AF' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.889vh center;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #83c1e8;
  }
}

.test-search-btn {
  height: 3.556vh;
  padding: 0 1.778vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 600;
  color: #ffffff;
  background: #447dbc;
  border: none;
  border-radius: 0.711vh;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, box-shadow 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #3a6aa5;
    box-shadow: 0 0.356vh 1.067vh rgba(68, 125, 188, 0.25);
  }

  &:active {
    background: #2f5a8f;
  }
}

/* 区域3：HOST 列表 */
.test-host-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 1.067vh 2.133vh;
  display: flex;
  flex-direction: column;
  gap: 1.067vh;
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

/* HOST 卡片（原型 .test-host-card） */
.test-host-card {
  background: #ffffff;
  border: 0.178vh solid #e8ecf1;
  border-radius: 1.244vh;
  padding: 1.6vh 1.778vh;
  box-shadow: 0 0.178vh 0.711vh rgba(0, 0, 0, 0.03), 0 0.533vh 1.778vh rgba(131, 193, 232, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    box-shadow: 0 0.356vh 1.422vh rgba(0, 0, 0, 0.05), 0 1.067vh 2.844vh rgba(131, 193, 232, 0.1);
    border-color: #c0daeb;
  }
}

.test-host-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1.067vh;
  margin-bottom: 1.067vh;
  border-bottom: 0.107vh solid #f0f2f5;
}

.test-host-name {
  font-size: 1.476vh;
  font-weight: 700;
  color: #1a1d21;
}

/* 状态胶囊（原型 .test-host-status） */
.test-host-status {
  display: inline-flex;
  align-items: center;
  gap: 0.533vh;
  font-size: 1.12vh;
  font-weight: 500;
  padding: 0.356vh 1.067vh;
  border-radius: 3.556vh;
  line-height: 1;

  &::before {
    content: '';
    width: 0.622vh;
    height: 0.622vh;
    border-radius: 50%;
  }

  &.is-free {
    color: #16a34a;
    background: #f0fdf4;

    &::before {
      background: #16a34a;
    }
  }

  &.is-occupied {
    color: #d97706;
    background: #fffbeb;

    &::before {
      background: #d97706;
      animation: cpu-status-pulse 2s ease-in-out infinite;
    }
  }

  &.is-running {
    color: #447dbc;
    background: #eff5fb;

    &::before {
      background: #447dbc;
      animation: cpu-status-pulse 2s ease-in-out infinite;
    }
  }

  &.is-offline {
    color: #9ca3af;
    background: #f3f4f6;

    &::before {
      background: #d1d5db;
    }
  }
}

.test-host-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.test-host-field {
  display: flex;
  align-items: center;
  min-height: 2.311vh;
  padding: 0.178vh 0;
}

.test-host-field-label {
  font-size: 1.298vh;
  font-weight: 500;
  color: #9ca3af;
  flex-shrink: 0;
  width: 8.889vh;

  &::after {
    content: '：';
  }
}

.test-host-field-value {
  font-size: 1.476vh;
  font-weight: 600;
  color: #1a1d21;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.test-host-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 1.067vh;
  margin-top: 1.067vh;
  border-top: 0.107vh solid #f0f2f5;
}

/* 按钮（原型 .btn-occupy / .btn-remote） */
.btn-occupy {
  padding: 0.711vh 1.6vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 600;
  color: #ffffff;
  background: #447dbc;
  border: none;
  border-radius: 0.711vh;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;

  &:hover {
    background: #3a6aa5;
    box-shadow: 0 0.356vh 1.067vh rgba(68, 125, 188, 0.25);
  }

  &:active {
    background: #2f5a8f;
  }

  &:disabled {
    opacity: 1;
    background: #9ca3af;
    color: #ffffff;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.btn-remote {
  padding: 0.711vh 1.6vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 600;
  color: #447dbc;
  background: #ffffff;
  border: 0.178vh solid #447dbc;
  border-radius: 0.711vh;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;

  &:hover {
    background: #f0f7fd;
  }

  &:active {
    background: #dcebf8;
  }
}

/* 列表 loading（原型 .test-loading-spinner / .spinner-ring） */
.test-loading-spinner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.6vh;
}

.spinner-ring {
  width: 5.333vh;
  height: 5.333vh;
  border: 0.498vh solid #e3eaf1;
  border-top-color: #83c1e8;
  border-radius: 50%;
  animation: cpu-spinner-rotate 0.8s linear infinite;
}

.test-loading-text {
  font-size: 1.476vh;
  font-weight: 500;
  color: #6b7280;
}

@keyframes cpu-spinner-rotate {
  to {
    transform: rotate(360deg);
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
