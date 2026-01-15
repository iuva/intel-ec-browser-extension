<!-- hostList.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { releaseHost, hostInfo } from '/@/api/host'
import { notify, info, success, warning, error } from '/@/utils/notification'
import browser from "webextension-polyfill";
import { showModal } from '../utils/modal'

// Define list item interface
interface ListItem {
  host_id: string
  host_ip: string
  user_name: string
}

// Define props
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

// Single selection index
const selectedIndex = ref(0)

// host-list-content element ref
const hostListContentRef = ref<HTMLElement | null>(null)

// Define component events
interface Emits {
  (e: 'itemClick', item: ListItem): void
  (e: 'connect', hostRecId: string): void
  (e: 'loading'): void
  (e: 'scrollToBottom'): void // New scroll to bottom event
}

// Define props and emits
const emits = defineEmits<Emits>()

// Handle item click event
const handleItemClick = (item: Record<string, any>, index: number) => {
  selectedIndex.value = index
  emits('itemClick', item as ListItem)
}

// @ts-ignore Connect to selected host
const handleConnectClick = (event) => {
  event.stopPropagation() // 阻止事件冒泡
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
          success('VNC connection successful')
          emits('connect', props.hostList[selectedIndex.value].host_rec_id)
        } else {
          emits('connect', '')
          error('VNC connection failed', res.error)
        }
      }).catch((err: Record<string, any>) => {
        error('VNC connection failed', err.message)
        emits('connect', '')
      })
  }).catch(() => {
    error('Failed to get VNC information')
    emits('connect', '')
  })
}

// @ts-ignore Abort recovery connection
const handleAbortClick = (event) => {
    event.stopPropagation() // 阻止事件冒泡

    // Use functional modal
    showModal({
      title: 'Operation Confirmation',
      msg: 'Are you sure you want to release this host connection?',
      showConfirm: true,
      confirmText: 'Confirm',
      showCancel: true,
      cancelText: 'Cancel',
      maskClosable: true,
      onConfirm: () => {
        releaseHost({ user_id: props.userId,
          host_list: [
            props.hostList[selectedIndex.value].host_id
          ]
        }).then(() => {
          success('Recovery connection abandoned')
          // Remove this host from the list
          props.hostList.splice(selectedIndex.value, 1)
        }).catch(() => {
          error('Failed to abandon recovery connection')
        })
      }
    })
}

// Watch hostList changes, reset selected index
watch(() => props.hostList, (newList) => {
  if (newList.length > 0 && selectedIndex.value >= newList.length) {
    selectedIndex.value = 0
  }
}, { immediate: true })

// Scroll listener function
const handleScroll = () => {
  if (!hostListContentRef.value) return
  
  const element = hostListContentRef.value
  const scrollTop = element.scrollTop
  const scrollHeight = element.scrollHeight
  const clientHeight = element.clientHeight
  
  // Check if scrolled to bottom (within 10px from bottom)
  const isBottom = scrollHeight - scrollTop - clientHeight <= 10
  
  if (isBottom) {
    console.log('Scrollbar has reached the bottom')
    emits('scrollToBottom')
  }
}

// Add scroll listener when component mounts
onMounted(() => {
  if (hostListContentRef.value) {
    hostListContentRef.value.addEventListener('scroll', handleScroll)
  }
})

// Remove scroll listener when component unmounts
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
          <!-- Radio circle -->
          <div class="radio-circle">
            <div class="radio-inner" :class="{ 'selected': index === selectedIndex }"></div>
          </div>
          
          <!-- User name -->
          <div class="host-list-item-label">{{ item.host_ip }}: {{ item.user_name }}</div>
        </div>
      </div>
      
      <button 
        class="nav-button up-button" 
        @click="handleConnectClick"
      >
        Connect Selected Host
      </button>
      <button 
        class="nav-button down-button" 
        @click="handleAbortClick"
        v-show="!isTc"
      >
        Abort Recovery Connection
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
  background-color: #00B0F0; /* Blue */
  color: white;
  
  &:not(:disabled):hover {
    background-color: #00B0F0;
  }
}

.down-button {
  background-color: #9e9e9e; /* Gray */
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
  
  /* Hide scrollbar but keep functionality */
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
  
  /* Icon styles for different statuses */
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