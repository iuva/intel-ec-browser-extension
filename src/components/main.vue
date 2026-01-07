<!-- main.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { CallbackEntity, MainPosition, MainParam } from '/@/entity/main'
import HostList from './hostList.vue'
import { getUserInfo, userAuth } from '/@/api/auth'
import { getRetryList, getAvailableList, reportConnect } from '/@/api/host'

/**
 * 背景颜色： 蓝色(blue)、红色(warning)
 * 组件图标：无(none)、叉(close)、叹号(warning)、查找(search)、加载中(loading)
 * 滑出状态：焦点时滑出(focus)，不滑出(not-appear)、滑出(appear)
 * 不圆角：上、下
 * 回调：点击回调、拖拽结束回调
 */
const mainParam = ref<MainParam>({
  background: 'blue',
  icon: 'loading',
  appear: 'focus',
  borderRadius: 'none',
  text: '',
  hostText: 'HOST',
  isTc: false,
})

const userInfo = ref({
  access_token: '',
  expires_in: 0,
  token_type: '',
  user: {
    administrator: false,
    authorized: true,
    email: '',
    full_name: '',
    idsid: '',
    name: '',
    wwid: '',
  }
})

const tcId = ref('')

const hostList = ref<Record<string, any>[]>([])

const monitorHost = ['hsdes-pre.intel.com', 'hsdes.intel.com']

const tcIdEl = ref<MutationRecord | null>(null)

// 监听路由变化，以修改是否处于可抓取 tc_id 的状态
const observeUrlChanges = () => {
  if(monitorHost.concat(location.hostname)){
    console.log('路由变化', location)
    checkTcPage()
  }
};

const checkTcPage = (): void => {
  mainParam.value.isTc = location.pathname == '/appstore/phoenix/execution'
}

// 监听浏览器前进/后退
window.addEventListener('popstate', observeUrlChanges);

// 监听hash变化（适用于单页应用）
window.addEventListener('hashchange', observeUrlChanges);

// 使用MutationObserver监听DOM变化来检测SPA路由变化
const urlObserver = new MutationObserver((mutations) => {
  // 检查是否有与路由相关的DOM变化
  mutations.forEach((mutation) => {
    // 检查URL是否发生变化
    const currentUrl = location.href;
    // @ts-ignore
    if (currentUrl !== urlObserver.lastUrl) {
      // @ts-ignore
      urlObserver.lastUrl = currentUrl;
      observeUrlChanges();
    }
    
    if(mainParam.value.isTc){
      
      if(mutation.target instanceof HTMLElement && mutation.target.classList.contains('selected')){
        if(tcIdEl.value){
          setTimeout(() => {
            updateTcId()
          }, 100);
        }
      }
      if(mutation.target instanceof HTMLElement && mutation.target.classList.contains('record-hierarchy-container')){
        const text = mutation.target.innerText
        const arr = text.split('[TC ID')
        if(arr.length > 1){
          tcIdEl.value = mutation
          const id = arr[1].replace(']', '').trim()
          if(id != tcId.value){
            tcId.value = id
            hostListReload()
            console.log('tcId', tcId.value)
          }
        }
      }
    }
    
  });
});

const updateTcId = () => {
  if(tcIdEl.value){
    // @ts-ignore
    const text = tcIdEl.value.target.innerText
    const arr = text.split('[TC ID')
    if(arr.length > 1){
      const id = arr[1].replace(']', '').trim()
      if(id != tcId.value){
        tcId.value = id
        hostListReload()
        console.log('tcId', tcId.value)
      }
    }
  }
}


urlObserver.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'data-route', 'href']
});


const mainElement = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })
const startTransform = ref({ x: 0, y: 0 })
// 是否有拖拽行为
const isMove = ref(false)
// 鼠标是否进入组件范围
const isMouseEnter = ref(false)
// 拖拽容忍度，在容忍度内将回调click事件
const dragTolerance = ref(5)
// 当前在左还是在右
const leftOrRight = ref('right')
// 是否显示在上方（当距离底部不足20vh时）
const showListAbove = ref(false)
// 是否显示host-list
const showList = ref(false)

// 回调函数定义
const callbacks = ref<CallbackEntity>({})


// 拖拽开始
const handleMouseDown = (e: MouseEvent) => {
  if (!mainElement.value) return

  isDragging.value = true
  isMove.value = false
  startPos.value = { x: e.clientX, y: e.clientY }

  // 获取当前元素位置
  const transform = getComputedStyle(mainElement.value).transform
  if (transform !== 'none') {
    const matrix = new DOMMatrix(transform)
    startTransform.value = { x: matrix.m41, y: matrix.m42 }
  } else {
    startTransform.value = { x: 0, y: 0 }
  }

  // 添加全局事件监听器
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // 防止文本选择
  e.preventDefault()
}

// 拖拽中
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !mainElement.value) return

  const dx = e.clientX - startPos.value.x
  const dy = e.clientY - startPos.value.y

  if(Math.abs(dx) > dragTolerance.value || Math.abs(dy) > dragTolerance.value){
    isMove.value = true
    mainElement.value.style.left = `auto`
    mainElement.value.style.right = `auto`
  }

  const rect = mainElement.value.getBoundingClientRect()

  const elementHeight = rect.height
  const elementWidth = rect.width

  const newX = e.clientX - elementWidth / 2
  const newY = e.clientY - elementHeight / 2

  if (mainElement.value) {
    mainElement.value.style.left = `${newX}px`
    mainElement.value.style.top = `${newY}px`
    // mainElement.value.style.transform = `translate(${newX}px, ${newY}px)`
  }
}

// 检查是否需要将列表显示在上方
const checkShowListPosition = () => {
  if (!mainElement.value) return
  
  // const rect = mainElement.value.getBoundingClientRect()
  // const windowHeight = window.innerHeight
  // 计算距离底部的距离
  // const distanceToBottom = windowHeight - rect.bottom
  
  // 如果距离底部不足20vh，则显示在上方
  // showListAbove.value = distanceToBottom < 20 * window.innerHeight / 100
}

// 拖拽结束
const handleMouseUp = () => {
  isDragging.value = false
  // 移除事件监听器
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  setTimeout(() => {
    snapToEdge()
    isMove.value = false
  }, 50)
    // 检查列表应该显示的位置
    checkShowListPosition()
}

// 吸附到边缘逻辑
const snapToEdge = () => {
  if (!mainElement.value) return

  const rect = mainElement.value.getBoundingClientRect()
  const windowWidth = window.innerWidth

  // 计算距离左右边缘的距离
  const distanceToLeft = rect.left
  const distanceToRight = windowWidth - rect.right

  // 获取当前纵向位置
  const currentY = rect.top
  // 获取窗口高度和元素高度
  const windowHeight = window.innerHeight
  const elementHeight = rect.height
  const elementWidth = rect.width
  
  // 计算最大允许的top值（确保元素不超出窗口底部）
  const maxTop = Math.max(0, windowHeight - elementHeight)
  // 确保top值在合理范围内
  const clampedY = Math.min(windowHeight * 0.72, Math.min(currentY, maxTop))

  // 计算当前位置信息
  const position: MainPosition = {
    left: '0',
    right: '0',
    top: clampedY,
    width: elementWidth,
    height: elementHeight
  }

  // 决定吸附到哪一边
  if (distanceToLeft <= distanceToRight) {
    // 吸附到左边
    mainElement.value.style.left = '0px'
    mainElement.value.style.right = 'auto'
    position.left = '0'
    position.right = 'auto'
    leftOrRight.value = 'left'
  } else {
    // 吸附到右边
    mainElement.value.style.left = 'auto'
    mainElement.value.style.right = '0px'
    position.left = 'auto'
    position.right = '0'
    leftOrRight.value = 'right'
  }

  // 移除transform并设置经过边界检查的top值
  mainElement.value.style.transform = 'none'
  mainElement.value.style.top = `${clampedY}px`

  // 吸附到边缘
  if(isMove.value){
    // 触发拖拽结束回调
    emitEvent('dragEnd', new Event('dragEnd'), position)
  }else{
    emitEvent('click', new Event('click'))

  }

}


const showOfTimeTaskId = ref()
const showOfTime = (time: number) => {
  clearTimeout(showOfTimeTaskId.value)
  isMouseEnter.value = true
  showOfTimeTaskId.value = setTimeout(() => {
    isMouseEnter.value = false
  }, time)
}


// 鼠标移入
const handleMouseEnter = () => {
  clearTimeout(showOfTimeTaskId.value)
  if(mainParam.value.appear === 'focus'){
    isMouseEnter.value = true
  }
}

// 鼠标移出
const handleMouseLeave = () => {
  clearTimeout(showOfTimeTaskId.value)
  if(mainParam.value.appear === 'focus'){
    isMouseEnter.value = false
  }
}

// 事件回调
const emitEvent = (name: keyof CallbackEntity, event: Event, position?: MainPosition) => {
  console.log('监听到事件：', name)
  const callback = callbacks.value[name]
  if (callback) {
    callback(event, position)
  }
}

const listReqInfo = {
  next: true,
  params: {
    tc_id: '',
    cycle_name: '',
    email: '',
    user_name: '',
    page_size: 50,
    last_id: ''
  }
}


const hostListLoad = () => {
    // 初始化失败时不尝试加载列表
  if(!userInfo.value.access_token || !listReqInfo.next){
    return
  }

  pageLoading()
  // 设为加载中
  if(tcId.value){
    // 加载 host 列表
    if(hostList.value.length > 0 && listReqInfo.next){
      // 证明需要加载下一页
      listReqInfo.params.last_id = hostList.value[hostList.value.length - 1].id
    }

    // @ts-ignore
    getAvailableList(listReqInfo.params).then((res) => {
      console.log('host 列表', res)
      pageSearch(`TC_ID: ${tcId.value}`)
      showList.value = true
      // @ts-ignore
      hostList.value = [...hostList.value, ...res.data.hosts]
      
      // @ts-ignore
      if(hostList.value.length >= res.data.total){
        listReqInfo.next = false
      }
    }).catch(err => {
      pageClose('加载失败')
    })

  } else if(hostList.value.length == 0){
    // 加载可恢复列表
    getRetryList({user_id: userInfo.value.user.full_name}).then(res => {
      console.log('host 可恢复列表', res)
      if(tcId.value){
        return
      }
      // @ts-ignore
      const hosts = res.data.hosts
      if(hosts && hosts.length > 0){
        hostList.value = hosts
        pageWarning('检测到您有待恢复的连接')
        showOfTime(5000)
        showList.value = true
      } else {
        // 停止加载中状态
        pageNone()
        showList.value = false
      }
    }).catch(err => {
      if(tcId.value){
        return
      }
      pageClose('加载失败')
    })
  }
}


// 加载host列表
const hostListReload = () => {
  // 初始化失败时不尝试加载列表
  if(!userInfo.value.access_token){
    return
  }

  listReqInfo.next = true
  if(tcId.value){
    // 加载 host 列表
    const urlParams = new URLSearchParams(window.location.search);
    const cycle = urlParams.get('cycle');
    listReqInfo.params = {
      tc_id: tcId.value,
      cycle_name: cycle || '',
      email: userInfo.value.user.email,
      user_name: userInfo.value.user.full_name,
      page_size: 50,
      last_id: ''
    }

  }
  hostList.value = []
  hostListLoad()
}

const pageSearch = (text?: string) => {
  setPageState('blue', 'search', text, 'focus')
}

const pageWarning = (text?: string) => {
  setPageState('blue', 'warning', text, 'focus')
}

const pageNone = (text?: string) => {
  setPageState('blue', 'none', text, 'focus')
}

const pageClose = (text: string) => {
  setPageState('warning', 'close', text, 'focus')
  showList.value = false
}

const pageLoading = () => {
  setPageState('blue', 'loading', '加载中', 'not-appear')
  showList.value = false
}

const setPageState = (
  background: 'blue' | 'warning' = 'blue', 
  icon: 'none' | 'loading' | 'close' | 'search' | 'warning' = 'none', 
  text = '', 
  appear: 'focus' | 'not-appear' | 'appear' = 'focus', 
  hostText = 'HOST'
) => {
  mainParam.value.background = background
  mainParam.value.icon = icon
  mainParam.value.text = text
  mainParam.value.appear = appear
  mainParam.value.hostText = hostText
}

// 组件挂载后初始化
onMounted(() => {
  // 初始检查列表显示位置
  checkShowListPosition()
  // 监听窗口大小变化，重新检查位置
  window.addEventListener('resize', checkShowListPosition)

  // 获取用户信息并鉴权
  getUserInfo().then(res => {
    // @ts-ignore
    userAuth(res.original_user).then(res => {
      console.log('用户鉴权', res)
      // @ts-ignore
      userInfo.value = res
      // 获取host列表
      hostListReload()
    }).catch(err => {
      pageClose('初始化失败')
    })
    console.log(res)
  }).catch(err => {
      pageClose('初始化失败')
  })
})

// 连接成功上报
const connectHost = (hostRecId: string) => {
  if(!hostRecId){
    
  }
  
    const urlParams = new URLSearchParams(window.location.search);
    const cycle = urlParams.get('cycle');
    const params = {
      user_id: userInfo.value.user.full_name,
      tc_id: tcId.value,
      cycle_name: cycle,
      user_name: userInfo.value.user.full_name,
      host_id: hostRecId,
      connection_status: "success",
      connection_time: new Date().toLocaleString(),
    }
    reportConnect(params).then(res => {
      console.log('连接成功上报', res)
    }).catch(err => {
      console.log('连接成功上报失败', err)
    }).finally(() => {
      pageSearch(`TC_ID: ${tcId.value}`)
      isMouseEnter.value = false
      if(hostList.value.length > 0){
        showList.value = true
      }
    })
}


// 组件卸载时清理事件监听
onUnmounted(() => {
  window.removeEventListener('resize', checkShowListPosition)
})

// 定义需要暴露给外部的方法
defineExpose({

  /**
   * 注册回调函数
   */
  registerCallback: (callback: CallbackEntity) => {
    callbacks.value = callback
  },

  setParam: (param: MainParam) => {
    mainParam.value = {...mainParam.value, ...param}

    if(mainParam.value.appear === 'not-appear'){
      isMouseEnter.value = false
    } else if(mainParam.value.appear === 'appear'){
      isMouseEnter.value = true
    }
  },

})

// 动态class 定义

const mainClass = computed(() => {
  return {
    'cpu-test-browser-extension-main-left': leftOrRight.value === 'left',
    'cpu-test-browser-extension-main-move': isMove.value,
    'cpu-test-browser-extension-main-radius-not-top': mainParam.value.borderRadius === 'top',
    'cpu-test-browser-extension-main-radius-not-bottom': mainParam.value.borderRadius === 'bottom',
  }
})

const mainConClass = computed(() => {
  return {
    'cpu-test-browser-extension-main-warning': mainParam.value.background === 'warning',
  }
})


</script>

<template>
  <div
    ref="mainElement"
    class="cpu-test-browser-extension-main"
    :class="mainClass"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter" 
    @mouseleave="handleMouseLeave"
  >
    <!-- 根据条件动态显示host-list的位置 -->
    <host-list 
    :host-list="hostList"
    :is-tc="!!tcId"
    :is-show="isMouseEnter && !isMove && showList"
    v-show="showListAbove"
    @connect="connectHost"
    @loading="pageLoading"
    ></host-list>
    
    <div 
    class="cpu-test-browser-extension-main-content" 
    :class="mainConClass"
    >
      <div class="main-content-icon">
        <div class="icon main-content-icon-close" v-if="mainParam.icon === 'close'">
          <span>×</span>
        </div>
        <div class="icon main-content-icon-warning" v-else-if="mainParam.icon === 'warning'">
          ¡
        </div>
        <div class="icon main-content-icon-search" v-else-if="mainParam.icon === 'search'">
          <img src="/@/img/search.png" alt="search"/>
        </div>
        <div class="icon main-content-icon-loading" v-else-if="mainParam.icon === 'loading'">
          <img src="/@/img/loading.png" alt="search"/>
        </div>
        <div class="text main-content-icon-host" v-else>
          {{ mainParam.hostText }}
        </div>
      </div>
      <div class="main-mouse-enter" :class="{'main-mouse-enter-hide': !isMouseEnter || isMove}">
        {{ mainParam.text }}
      </div>
    </div>
    
    <!-- 默认情况下显示在下方 -->
     
    <host-list 
    :host-list="hostList" 
    :is-tc="!!tcId" 
    :is-show="isMouseEnter && !isMove && showList"
    v-show="!showListAbove"
    :user-id="userInfo.user.full_name"
    @connect="connectHost"
    @scrollToBottom="hostListLoad"
    @loading="pageLoading"
    ></host-list>
  </div>
</template>

<style scoped lang="less">

.cpu-test-browser-extension-main {
  position: fixed;
  top: 50%; /* 初始纵向位置 */
  right: 0; /* 初始横向位置 */
  background-color: white;
  color: white;
  cursor: grab;
  user-select: none;
  z-index: 999999;
  /* 根据列表位置调整padding */
  padding: v-bind('showListAbove ? "0.5vh 0.5vh 0 0.5vh" : "0.5vh 0 0.5vh 0.5vh"');
  border-radius: 2.25vh 0 0 2.25vh;
  /* 添加阴影效果 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);

  /* 添加过渡动画使吸附更平滑 */
  // transition: transform 3s ease, opacity 3s ease;

  &:active {
    cursor: grabbing;
  }

  .cpu-test-browser-extension-main-content {
    display: flex !important;
    align-items: center !important;
    height: 4vh;
    background-color: #00B0F0;
    border-radius: 2vh 0 0 2vh;
    font-size: 1.4vh;

    .main-content-icon{
      display: flex;
      align-items: center;
      .main-content-icon-host{
        padding: 0.5vh;
      }

      .icon{
        width: 3vh;
        height: 3vh;
        border: 0.3vh solid white;
        border-radius: 50%;
        margin-left: 0.5vh;
        margin-right: 1.5vh;
        line-height: 2.2vh;
      }

      .main-content-icon-close{
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 3vh;
        margin-bottom: 0.2vh;
      }

      .main-content-icon-warning{
        font-size: 2.6vh;
        text-align: center;
        line-height: 1.3vh;
      }

      .main-content-icon-search{
        display: flex;
        justify-content: center;
        align-items: center;

        img{
          width: 2vh;
          height: 2vh;
        }
      }

      .main-content-icon-loading{
        display: flex;
        justify-content: center;
        align-items: center;

        img{
          width: 2vh;
          height: 2vh;
          animation: rotate 1s linear infinite;
        }
      }
    }

    .main-mouse-enter{
      transition: max-width 0.2s ease-in-out;
      max-width: 20vh;
      white-space: nowrap;
      overflow: hidden;
      padding: 0 0.5vh;
    }

    .main-mouse-enter-hide{
      max-width: 0;
      padding: 0;
      // animation: widthChange 2s infinite alternate;
    }
  }
  
  .cpu-test-browser-extension-main-warning{
    background-color: #F08BB4;
  }
}


@keyframes rotate {
  from {
    transform: rotate(360deg);
  }
  to {
    transform: rotate(0deg);
  }
}

.cpu-test-browser-extension-main-radius-not-top{
  border-radius: 0 0 0 2.25vh;
}

.cpu-test-browser-extension-main-radius-not-bottom{
  border-radius: 2.25vh 0 0 0;
}

.cpu-test-browser-extension-main-left{
  border-radius: 0 2.25vh 2.25vh 0;
  padding: 0.5vh 0.5vh 0.5vh 0;

  .cpu-test-browser-extension-main-content {
    border-radius: 0 2vh 2vh 0;
    flex-direction: row-reverse;

    .main-content-icon {
      .icon {
        margin-left: 1.5vh;
        margin-right: 0.5vh;
      }
    }
  }
}

.cpu-test-browser-extension-main-move{
  border-radius: 2.25vh;
  padding: 0.5vh;

  .cpu-test-browser-extension-main-content {
    border-radius: 2vh;

    .main-content-icon {
      .icon {
        margin-left: 0.5vh;
        margin-right: 0.5vh;
      }
    }
  }
}
</style>
