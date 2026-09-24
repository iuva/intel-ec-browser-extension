<script setup lang="ts">
import FloatButton from "/@/components/floatButton.vue";
import Copilot from "/@/components/copilot/index.vue";
import {ref} from "vue";

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
        v-model:show="copilotState.show"
        ref="copilotRef"

    />
  </div>

</template>

<style scoped lang="less">

</style>