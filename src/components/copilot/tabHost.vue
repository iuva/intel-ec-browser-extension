<!-- tabHost.vue -->
<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import StateCard from './stateCard.vue'
import { PANEL_API_KEY, type PanelApi } from './context'
import { imgNoHost } from './images'

/**
 * 「My HOST」页签（原型 data-tab="occupied"）：
 * 已占用 HOST 任务卡片列表 + 取消测试 / Remote 操作。
 * 状态：has-data（有占用）| no-data（无占用，空态卡）。
 *
 * 入参：
 * - hosts 已占用 HOST 列表（不传时使用原型演示数据）
 * 回调事件：
 * - release 取消测试确认后触发（业务接入点）
 * - remote  Remote 确认后触发（业务接入点）
 * - count-change 占用数量变化（供外壳 tab 徽标使用）
 */
export interface HostOccupyItem {
  tcid: string
  host: string
  status: 'Occupied' | 'Running'
  /** Last Time */
  time: string
  /** Occupy Dur */
  duration: string
  /** Used Time */
  occupyTime: string
}

const props = withDefaults(defineProps<{
  hosts?: HostOccupyItem[]
}>(), {
  hosts: undefined,
})

const emit = defineEmits<{
  (e: 'release', item: HostOccupyItem): void
  (e: 'remote', item: HostOccupyItem): void
  (e: 'count-change', count: number): void
}>()

const panel = inject<PanelApi | null>(PANEL_API_KEY, null)

/** 原型演示数据（occupiedHosts） */
const demoHosts: HostOccupyItem[] = [
  { tcid: '15014591568', host: 'jwan160-mobl', status: 'Occupied', time: '2026-08-24 10:30', duration: '2h 15m', occupyTime: '2026-08-24 08:15' },
  { tcid: '15014591569', host: 'jwan161-mobl', status: 'Running', time: '2026-08-24 11:45', duration: '1h 05m', occupyTime: '2026-08-24 10:40' },
  { tcid: '15014591570', host: 'jwan162-mobl', status: 'Occupied', time: '2026-08-23 18:20', duration: '5h 40m', occupyTime: '2026-08-23 12:40' },
  { tcid: '15014591581', host: 'jwan163-mobl', status: 'Running', time: '2026-08-25 09:05', duration: '3h 21m', occupyTime: '2026-08-25 05:44' },
  { tcid: '15014591582', host: 'jwan164-mobl', status: 'Occupied', time: '2026-08-25 07:58', duration: '6h 02m', occupyTime: '2026-08-25 01:56' },
  { tcid: '15014591583', host: 'jwan165-mobl', status: 'Running', time: '2026-08-24 21:40', duration: '10h 18m', occupyTime: '2026-08-24 11:22' },
  { tcid: '15014591584', host: 'jwan166-mobl', status: 'Occupied', time: '2026-08-25 12:15', duration: '1h 47m', occupyTime: '2026-08-25 10:28' },
  { tcid: '15014591585', host: 'jwan167-mobl', status: 'Occupied', time: '2026-08-23 09:30', duration: '20h 45m', occupyTime: '2026-08-22 12:45' },
]

const list = ref<HostOccupyItem[]>(props.hosts ?? demoHosts)

watch(() => props.hosts, (hosts) => {
  if (hosts) list.value = hosts
})

watch(() => list.value.length, (count) => emit('count-change', count), { immediate: true })

/** 取消测试：确认 → loading 1.5s → 成功态 4s 自动关闭并移除卡片（原型 runCancelTest / autoCloseSuccess） */
const onRelease = async (item: HostOccupyItem) => {
  const ok = await panel?.confirm({
    title: 'Cancel Test',
    message: `Cancel test task for "${item.host}"? The HOST occupancy will be released.`,
    confirmText: 'Confirm',
    type: 'warning',
  })
  if (!ok) return
  emit('release', item)

  panel?.showLoading(`Cancelling test on "${item.host}"…`)
  window.setTimeout(() => {
    panel?.showResult({
      success: true,
      title: 'Test cancelled',
      message: `Occupancy on "${item.host}" has been released.`,
      autoClose: 4000,
    })
    list.value = list.value.filter((it) => it.tcid !== item.tcid)
  }, 1500)
}

/** Remote：确认后触发业务回调（原型演示不改变数据状态） */
const onRemote = async (item: HostOccupyItem) => {
  const ok = await panel?.confirm({
    title: 'Connect',
    message: `Connect to "${item.host}" via RealVNC?`,
    confirmText: 'Connect',
    type: 'info',
  })
  if (ok) emit('remote', item)
}
</script>

<template>
  <div class="cpu-copilot-list-container">
    <template v-if="list.length > 0">
      <div v-for="item in list" :key="item.tcid" class="cpu-task-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-tcid">TC_ID: {{ item.tcid }}</span>
          </div>
          <span class="card-status">{{ item.status }}</span>
        </div>
        <div class="card-main">
          <div class="card-body">
            <div class="card-field">
              <span class="card-field-label">Host Name</span>
              <span class="card-field-value">{{ item.host }}</span>
            </div>
            <div class="card-field">
              <span class="card-field-label">Used Time</span>
              <span class="card-field-value">{{ item.occupyTime }}</span>
            </div>
            <div class="card-field">
              <span class="card-field-label">Last Time</span>
              <span class="card-field-value">{{ item.time }}</span>
            </div>
            <div class="card-field">
              <span class="card-field-label">Occupy Dur</span>
              <span class="card-field-value is-warning">{{ item.duration }}</span>
            </div>
          </div>
          <div class="card-footer">
            <button type="button" class="btn btn-release" @click="onRelease(item)">Cancel Test</button>
            <button type="button" class="btn btn-resume" @click="onRemote(item)">Remote</button>
          </div>
        </div>
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
