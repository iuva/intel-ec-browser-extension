<!-- stateCard.vue -->
<script setup lang="ts">
/**
 * 通用状态卡（原型 .test-state-card）：各页签的空态 / 加载超时 / 无匹配 / 示例输入等共用布局。
 * DOM 顺序与原型 buildStateCard 一致：title → reason → media → btn。
 *
 * 入参：
 * - img     卡片插图（data URL，可不传）
 * - title   标题
 * - reason  说明文案（\n 换行）
 * - btnText 操作按钮文案（不传则不渲染按钮）
 * - scan    插图是否叠加扫描动画（等待识别态）
 */
withDefaults(defineProps<{
  img?: string
  title?: string
  reason?: string
  btnText?: string
  scan?: boolean
}>(), {
  img: '',
  title: '',
  reason: '',
  btnText: '',
  scan: false,
})

const emit = defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <div class="cpu-test-state-card">
    <div v-if="title" class="cpu-test-state-card-title">{{ title }}</div>
    <div v-if="reason" class="cpu-test-state-card-reason">{{ reason }}</div>
    <div v-if="img" class="cpu-test-state-card-media" :class="{ 'is-scan': scan }">
      <img :src="img" :alt="title" draggable="false" />
      <span v-if="scan" class="cpu-test-state-card-scan"></span>
    </div>
    <button
      v-if="btnText"
      type="button"
      class="cpu-test-state-card-btn"
      @click="emit('action')"
    >{{ btnText }}</button>
  </div>
</template>

<style lang="less" scoped>
/* 数值还原原型 .test-state-card（1.476vh 正文 / 0.178vh 描边 / 1.422vh 圆角） */
.cpu-test-state-card {
  flex: 1;
  margin: 1.422vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1.244vh;
  padding: 2.667vh 2.844vh;
  background: #ffffff;
  border: 0.178vh solid #e8ecf1;
  border-radius: 1.422vh;
  box-shadow: 0 0.178vh 0.711vh rgba(0, 0, 0, 0.03), 0 0.533vh 1.778vh rgba(131, 193, 232, 0.06);
  text-align: center;

  .cpu-test-state-card-title {
    margin-bottom: 0.533vh;
    font-size: 1.671vh;
    font-weight: 600;
    color: #1a1d21;
  }

  .cpu-test-state-card-reason {
    margin-bottom: 1.067vh;
    font-size: 1.476vh;
    font-weight: 400;
    color: #6b7280;
    line-height: 1.5;
    max-width: 39.111vh;
    white-space: pre-line;
  }

  .cpu-test-state-card-media {
    width: 19.067vh;
    height: auto;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.356vh;

    img {
      width: 100%;
      height: auto;
      object-fit: contain;
      display: block;
      pointer-events: none;
    }

    /* 等待识别态：头像扫描线（原型 .is-scan / .test-state-card-scan） */
    &.is-scan {
      background: #b1cee3;
      position: relative;
    }
  }

  .cpu-test-state-card-scan {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0.284vh;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.9), transparent);
    box-shadow: 0 0 1.067vh 0.356vh rgba(255, 255, 255, 0.6), 0 0 2.133vh 0.533vh rgba(255, 255, 255, 0.3);
    animation: cpu-scan-vertical 2s ease-in-out infinite;
    pointer-events: none;
  }

  .cpu-test-state-card-btn {
    margin-top: 0.889vh;
    padding: 0.8vh 2.133vh;
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
  }
}

@keyframes cpu-scan-vertical {
  0% {
    top: 0;
  }
  50% {
    top: calc(100% - 0.284vh);
  }
  100% {
    top: 0;
  }
}
</style>
