<!-- hostList.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { releaseHost, hostInfo } from '/@/api/host'
import { notify, info, success, warning, error } from '/@/utils/notification'
import browser from "webextension-polyfill";
import { showModal } from '../utils/modal'

// 定义列表条目接口
interface ListItem {
  host_id: string
  host_ip: string
  user_name: string
}

// 定义props
const props = defineProps({
  hostList: {
    type: Array as () => Record<string, any>[],
    default: () => []
  },
  isTc: {
    type: Boolean,
    default: false
  },
  isShow: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: ''
  },

})

// 单选选中的索引
const selectedIndex = ref(0)

// host-list-content元素的ref
const hostListContentRef = ref<HTMLElement | null>(null)

// 定义组件事件
interface Emits {
  (e: 'itemClick', item: ListItem): void
  (e: 'connect', hostRecId: string): void
  (e: 'loading'): void
  (e: 'scrollToBottom'): void // 新增滚动到底部事件
}

// 定义props和emits
const emits = defineEmits<Emits>()

// 处理条目点击事件
const handleItemClick = (item: Record<string, any>, index: number) => {
  selectedIndex.value = index
  emits('itemClick', item as ListItem)
}

// 连接到所选host
const handleConnectClick = () => {
  emits('loading')

  
  hostInfo({id: props.hostList[selectedIndex.value].host_rec_id || props.hostList[selectedIndex.value].host_id}).then((res) => {

    // @ts-ignore
    const data = res.data
      browser.runtime.sendMessage({
          type: 'vncConnect',
          hostInfo: {
            host: data.ip,
            port: data.port,
            password: data.password,
            username: data.username,
          }
      }).then((res: Record<string, any>) => {
        if (res.success) {
          success('VNC连接成功')
          emits('connect', props.hostList[selectedIndex.value].host_rec_id)
        } else {
          emits('connect', '')
          error('VNC连接失败', res.error)
        }
      }).catch((err: Record<string, any>) => {
        error('VNC连接失败', err.message)
        emits('connect', '')
      })
  }).catch(() => {
    error('获取 vnc 信息失败')
    emits('connect', '')
  })
}

// 放弃恢复连接
const handleAbortClick = () => {

    // 使用函数式弹窗
    showModal({
      title: '操作确认',
      msg: '确定要释放此host的连接吗？',
      showConfirm: true,
      confirmText: '确定',
      showCancel: true,
      cancelText: '取消',
      maskClosable: true,
      onConfirm: () => {
        releaseHost({ user_id: props.userId,
          host_list: [
            props.hostList[selectedIndex.value].host_id
          ]
        }).then(() => {
          success('已放弃恢复连接')
          // 从列表中删除此host
          props.hostList.splice(selectedIndex.value, 1)
        }).catch(() => {
          error('放弃恢复连接失败')
        })
      }
    })
}

// 监听hostList变化，重置选中索引
watch(() => props.hostList, (newList) => {
  if (newList.length > 0 && selectedIndex.value >= newList.length) {
    selectedIndex.value = 0
  }
}, { immediate: true })

// 滚动监听函数
const handleScroll = () => {
  if (!hostListContentRef.value) return
  
  const element = hostListContentRef.value
  const scrollTop = element.scrollTop
  const scrollHeight = element.scrollHeight
  const clientHeight = element.clientHeight
  
  // 判断是否滚动到底部（距离底部10px以内）
  const isBottom = scrollHeight - scrollTop - clientHeight <= 10
  
  if (isBottom) {
    console.log('滚动条已滑动到底部')
    emits('scrollToBottom')
  }
}

// 组件挂载时添加滚动监听
onMounted(() => {
  if (hostListContentRef.value) {
    hostListContentRef.value.addEventListener('scroll', handleScroll)
  }
})

// 组件卸载时移除滚动监听
onUnmounted(() => {
  if (hostListContentRef.value) {
    hostListContentRef.value.removeEventListener('scroll', handleScroll)
  }
})


</script>

<template>
    <div class="host-list-container" :class="{'host-list-container-show': !isShow}">
      
      <div class="host-list-content" ref="hostListContentRef">
        <div
          v-for="(item, index) in hostList"
          :key="item.host_id"
          class="host-list-item"
          :class="{ 'selected': index === selectedIndex }"
          @click="handleItemClick(item, index)"
        >
          <!-- 单选圆圈 -->
          <div class="radio-circle">
            <div class="radio-inner" :class="{ 'selected': index === selectedIndex }"></div>
          </div>
          
          <!-- 用户名称 -->
          <div class="host-list-item-label">{{ item.host_ip }}：{{ item.user_name }}</div>
        </div>
      </div>
      
      <button 
        class="nav-button up-button" 
        @click="handleConnectClick"
      >
        连接所选host
      </button>
      <button 
        class="nav-button down-button" 
        @click="handleAbortClick"
        v-show="!isTc"
      >
        放弃恢复连接
      </button>
    </div>
</template>

<style scoped lang="less">
  
.host-list-container {
  display: flex;
  flex-direction: column;
  transition: max-width 0.15s ease-in-out, max-height 0.15s ease-in-out;
  // width: 100%;
  max-width: 30vh;
  max-height: 25vh;
  border-radius: 1vh;
  box-sizing: border-box;
  font-size: 1.4vh;
  gap: 1vh;
  overflow: hidden;
  margin: 1vh 0;
}

.host-list-container-show{
  max-width: 0;
  max-height: 0vh;
  margin: 0;
}

.nav-button {
  width: calc(100% - 2vh);
  height: 3vh;
  border: none;
  border-radius: 0.5vh;
  cursor: pointer;
  font-size: 1.2vh;
  font-weight: bold;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 1vh;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:not(:disabled):hover {
    transform: translateY(-0.1vh);
    box-shadow: 0 0.2vh 0.4vh rgba(0, 0, 0, 0.2);
  }
  
  &:not(:disabled):active {
    transform: translateY(0);
  }
}

.up-button {
  background-color: #00B0F0; /* 蓝色 */
  color: white;
  
  &:not(:disabled):hover {
    background-color: #00B0F0;
  }
}

.down-button {
  background-color: #9e9e9e; /* 灰色 */
  color: white;
  margin-bottom: 1vh;
  
  &:not(:disabled):hover {
    background-color: #757575;
  }
}

.host-list-content {
  flex: 1;
  max-height: 18vh;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 1vh;
  display: flex;
  flex-direction: column;
  gap: 0.5vh;
  
  /* 隐藏滚动条但保持功能 */
  &::-webkit-scrollbar {
    width: 0.5vh;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 0.25vh;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #999;
  }
}

.host-list-item {
  display: flex;
  align-items: center;
  padding: 0.5vh;
  margin-bottom: 0.25vh;
  background-color: white;
  border-radius: 0.5vh;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
  white-space: nowrap;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:hover {
    background-color: #e3f2fd;
  }
  
  &.selected {
    background-color: #bbdefb;
    border: 0.1vh solid #2196f3;
  }
}

.radio-circle {
  width: 1.8vh;
  height: 1.8vh;
  border: 0.2vh solid #ccc;
  border-radius: 50%;
  margin-right: 0.75vh;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.radio-inner {
  width: 0.8vh;
  height: 0.8vh;
  border-radius: 50%;
  background-color: transparent;
  transition: all 0.2s ease;
  
  &.selected {
    background-color: #2196f3;
  }
}

.host-list-item-label {
  flex: 1;
  color: #333;
  font-size: 1.3vh;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 0.75vh;
}

.host-list-item-icon {
  margin-right: 0.75vh;
}

.icon-status {
  width: 2vh;
  height: 2vh;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2vh;
  font-weight: bold;
  
  /* 不同状态的图标样式 */
  &.host-list-item-icon-success {
    background-color: #4caf50;
    color: white;
  }
  
  &.host-list-item-icon-warning {
    background-color: #ff9800;
    color: white;
  }
  
  &.host-list-item-icon-error {
    background-color: #f44336;
    color: white;
  }
  
  &.host-list-item-icon-pending {
    background-color: #2196f3;
    color: white;
  }
}

.host-list-item-status {
  font-size: 1.1vh;
  padding: 0.2vh 0.5vh;
  border-radius: 0.5vh;
  background-color: #f5f5f5;
  color: #666;
}
</style>