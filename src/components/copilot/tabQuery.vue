<!-- tabQuery.vue -->
<script setup lang="ts">
import { inject, ref } from 'vue'
import StateCard from './stateCard.vue'
import { PANEL_API_KEY, type PanelApi } from './context'
import { imgNoMatch, imgTimeout } from './images'

/**
 * 「Direct Mode」页签（原型 data-tab="query"）状态机：
 * input 需求输入 → loading 查询中 → host-list 查询成功 / no-match 无匹配 / timeout 查询超时。
 *
 * 回调事件：
 * - search   发起需求查询（业务接入点）
 * - host-open 点击结果卡片（业务接入点）
 */
export interface QueryHostItem {
  tcid: string
  host: string
  status: 'Free' | 'Occupied' | 'Running' | 'Offline'
  occupyTime?: string
  occupier?: string
  duration?: string
}

const emit = defineEmits<{
  (e: 'search', requirement: string): void
  (e: 'host-open', host: QueryHostItem): void
}>()

const panel = inject<PanelApi | null>(PANEL_API_KEY, null)

type QueryState = 'input' | 'loading' | 'host-list' | 'no-match' | 'timeout'

/** 原型演示数据（queryHosts） */
const demoHosts: QueryHostItem[] = [
  { tcid: '15014591571', host: 'spa220-mobl', status: 'Occupied', occupyTime: '2026-08-25 09:12', occupier: 'zhang.wei@intel.com', duration: '2h 30m' },
  { tcid: '15014591572', host: 'spa221-mobl', status: 'Free' },
  { tcid: '15014591573', host: 'spa222-mobl', status: 'Running', occupyTime: '2026-08-25 08:00', occupier: 'li.na@intel.com', duration: '3h 42m' },
  { tcid: '15014591574', host: 'spa223-mobl', status: 'Free' },
  { tcid: '15014591575', host: 'spa224-mobl', status: 'Offline' },
]

const state = ref<QueryState>('input')
const requirement = ref('')
const inputError = ref(false)
const hosts = ref<QueryHostItem[]>([])

const clearError = () => {
  inputError.value = false
}

/** 需求查询：空输入提示（原型 empty-query 错误样式）；否则 loading 1.5s → host-list */
const onSearch = () => {
  if (!requirement.value.trim()) {
    inputError.value = true
    return
  }
  emit('search', requirement.value.trim())
  state.value = 'loading'
  window.setTimeout(() => {
    hosts.value = demoHosts
    state.value = 'host-list'
  }, 1500)
}

/** 重置：清空输入回到需求输入态（原型 queryResetBtn） */
const onReset = () => {
  requirement.value = ''
  clearError()
  state.value = 'input'
}

const retryLoad = () => {
  state.value = 'loading'
  window.setTimeout(() => {
    hosts.value = demoHosts
    state.value = 'host-list'
  }, 1500)
}

const searchAgain = retryLoad
</script>

<template>
  <div class="cpu-copilot-query-layout">
    <div class="query-content">
      <div class="query-search-area">
        <label class="query-search-label">Requirement</label>
        <div class="query-search-row">
          <textarea
            v-model="requirement"
            class="query-search-textarea"
            :class="{ 'is-error': inputError }"
            placeholder="Enter HOST name or HW req."
            @input="clearError"
          ></textarea>
          <div class="query-search-actions">
            <button type="button" class="test-search-btn query-search-btn" @click="onSearch">Search</button>
            <button type="button" class="query-reset-btn" @click="onReset">Reset</button>
          </div>
        </div>
        <div v-if="inputError" class="query-search-error">Enter a query first</div>
      </div>

      <div class="query-result-area">
        <!-- 状态1：等待需求输入（示例输入卡） -->
        <StateCard
          v-if="state === 'input'"
          title="Example input:"
          reason="UC1: hostname shfivdrm19&#10;UC2: 1socket, 8.1 memory population"
        />

        <!-- 状态2：查询中 -->
        <div v-else-if="state === 'loading'" class="test-loading-spinner">
          <div class="spinner-ring"></div>
          <div class="test-loading-text">Loading HOST list…</div>
        </div>

        <!-- 状态4：无匹配 -->
        <StateCard
          v-else-if="state === 'no-match'"
          :img="imgNoMatch"
          title="No matching HOST"
          reason="No HOST matches the requirement. Adjust & search again"
          btn-text="Search"
          @action="searchAgain"
        />

        <!-- 状态5：查询超时 -->
        <StateCard
          v-else-if="state === 'timeout'"
          :img="imgTimeout"
          title="Load timeout"
          reason="HOST matching API timed out. Check network & retry"
          btn-text="Retry"
          @action="retryLoad"
        />

        <!-- 状态3：查询成功 HOST 列表（与「我的HOST」卡片同构，无操作按钮） -->
        <template v-else>
          <StateCard
            v-if="hosts.length === 0"
            :img="imgNoMatch"
            title="No matching HOST"
            reason="No HOST matches the requirement. Adjust & search again"
          />
          <div
            v-for="host in hosts"
            :key="host.tcid"
            class="test-host-card"
            @click="emit('host-open', host)"
          >
            <div class="test-host-card-header">
              <span class="card-tcid">TC_ID: {{ host.status === 'Free' || host.status === 'Offline' ? '--' : host.tcid }}</span>
              <span class="test-host-status" :class="`is-${host.status.toLowerCase()}`">{{ host.status }}</span>
            </div>
            <div class="test-host-fields">
              <div class="test-host-field">
                <span class="test-host-field-label">Host Name</span>
                <span class="test-host-field-value">{{ host.host }}</span>
              </div>
              <div class="test-host-field">
                <span class="test-host-field-label">Used By </span>
                <span class="test-host-field-value">{{ host.occupier || '--' }}</span>
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
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
/* ===== 查询模式布局（原型 .query-layout / .query-content） ===== */
.cpu-copilot-query-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.query-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 搜索区 */
.query-search-area {
  padding: 1.422vh 1.778vh;
  display: flex;
  flex-direction: column;
  gap: 0.889vh;
  border-bottom: 0.107vh solid #e5e7eb;
  background: #ffffff;
  flex-shrink: 0;
}

.query-search-label {
  font-size: 1.298vh;
  font-weight: 600;
  color: #447dbc;
}

.query-search-row {
  display: flex;
  align-items: stretch;
  gap: 1.067vh;
}

.query-search-textarea {
  flex: 1;
  min-width: 0;
  height: 8vh;
  padding: 0.889vh 1.244vh;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 400;
  color: #1f2937;
  border: 0.178vh solid #d1d5db;
  border-radius: 0.711vh;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
  background: #fafbfc;
  line-height: 1.5;

  &::placeholder {
    color: #b0b4ba;
  }

  &:focus {
    border-color: #83c1e8;
    background: #ffffff;
  }

  &.is-error {
    border-color: #d4656a;
    background: #fffbfb;
  }
}

.query-search-error {
  font-size: 1.12vh;
  color: #d4656a;
  margin-top: 0.533vh;
  line-height: 1.4;
}

.query-search-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.711vh;
  flex-shrink: 0;
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

.query-search-btn {
  width: 7.111vh;
  height: 3.556vh;
  padding: 0;
  flex-shrink: 0;
}

.query-reset-btn {
  width: 7.111vh;
  height: 3.556vh;
  padding: 0;
  flex-shrink: 0;
  font-family: inherit;
  font-size: 1.298vh;
  font-weight: 600;
  color: #6b7280;
  background: #ffffff;
  border: 0.178vh solid #d1d5db;
  border-radius: 0.711vh;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:active {
    background: #f3f4f6;
  }
}

/* 结果区（原型 .query-result-area） */
.query-result-area {
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

/* 列表 loading（原型 .test-loading-spinner） */
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
