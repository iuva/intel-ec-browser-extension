<script setup lang="ts">
import FloatButton from "/@/components/floatButton.vue";
import Copilot from "/@/components/copilot/index.vue";
import {onMounted, ref} from "vue";

const fbState = ref({
  tooltip: "Open panel",
})

const fbClick = (...args: any[]) => {
  console.log('fbClick', args)
  copilotState.value.show = true
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

  // 用户状态：0识别中，1用户信息获取失败，2用户信息获取成功
const userState = ref<0 | 1 | 2>(0)
/** 用户信息（获取成功后展示在面板顶栏） */
const user = ref('')

let loadTimer = 0

/** 获取用户信息：面板识别中/失败态的 Retry 均回调此方法 */
const loadUserInfo = () => {
  userState.value = 0
  window.clearTimeout(loadTimer)
  // 演示：1.5s 后获取成功；真实场景调用 Auth API / PHOENIX 获取用户信息，失败时置 userState = 1
  loadTimer = window.setTimeout(() => {
    user.value = 'zhang.wei@intel.com'
    userState.value = 2
  }, 15000)
}

onMounted(loadUserInfo)

</script>

<template>
  <div class="main-page">
    <FloatButton
      :tooltip="fbState.tooltip"
      @click="fbClick"
      @dragEnd="fbDragEnd"
    />

    <Copilot
        :position="copilotState.position"
        :user="user"
        :user-state="userState"
        v-model:show="copilotState.show"
        ref="copilotRef"
        @retry-user-info="loadUserInfo"

    />
  </div>

</template>

<style scoped lang="less">

</style>