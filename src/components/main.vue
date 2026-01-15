<!-- main.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { CallbackEntity, MainPosition, MainParam } from '/@/entity/main'
import HostList from './hostList.vue'
import { getUserInfo, userAuth } from '/@/api/auth'
import { getRetryList, getAvailableList, reportConnect } from '/@/api/host'

/**
 * Background color: blue(blue), red(warning)
 * Component icons: none(none), close(close), warning(warning), search(search), loading(loading)
 * Slide-out state: slide out on focus(focus), do not slide out(not-appear), slide out(appear)
 * No rounded corners: top, bottom
 * Callbacks: click callback, drag end callback
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

// Monitor route changes to modify whether in a state to capture tc_id
const observeUrlChanges = () => {
  if(monitorHost.concat(location.hostname)){
    console.log('Route changed', location)
    checkTcPage()
  }
};

const checkTcPage = (): void => {
  mainParam.value.isTc = location.pathname == '/appstore/phoenix/execution'
}

// Listen to browser forward/back
window.addEventListener('popstate', observeUrlChanges);

// Listen to hash changes (for single page applications)
window.addEventListener('hashchange', observeUrlChanges);

// Use MutationObserver to monitor DOM changes to detect SPA route changes
const urlObserver = new MutationObserver((mutations) => {
  // Check if there are route-related DOM changes
  mutations.forEach((mutation) => {
    // Check if URL has changed
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
// Whether there is drag behavior
const isMove = ref(false)
// Whether mouse has entered component range
const isMouseEnter = ref(false)
// Drag tolerance, within tolerance will callback click event
const dragTolerance = ref(5)
// Currently on left or right
const leftOrRight = ref('right')
// Whether to display above (when distance to bottom is less than 20vh)
const showListAbove = ref(false)
// Whether to display host-list
const showList = ref(false)

// Callback function definition
const callbacks = ref<CallbackEntity>({})


// Drag start
const handleMouseDown = (e: MouseEvent) => {
  if (!mainElement.value) return

  isDragging.value = true
  isMove.value = false
  startPos.value = { x: e.clientX, y: e.clientY }

  // Get current element position
  const transform = getComputedStyle(mainElement.value).transform
  if (transform !== 'none') {
    const matrix = new DOMMatrix(transform)
    startTransform.value = { x: matrix.m41, y: matrix.m42 }
  } else {
    startTransform.value = { x: 0, y: 0 }
  }

  // Add global event listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // Prevent text selection
  e.preventDefault()
}

// Dragging
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

// Check if list needs to be displayed above
const checkShowListPosition = () => {
  if (!mainElement.value) return
  
  // const rect = mainElement.value.getBoundingClientRect()
  // const windowHeight = window.innerHeight
  // Calculate distance to bottom
  // const distanceToBottom = windowHeight - rect.bottom
  
  // If distance to bottom is less than 20vh, display above
  // showListAbove.value = distanceToBottom < 20 * window.innerHeight / 100
}

// Drag end
const handleMouseUp = () => {
  isDragging.value = false
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  setTimeout(() => {
    snapToEdge()
    isMove.value = false
  }, 50)
    // Check where the list should be displayed
    checkShowListPosition()
}

// Snap to edge logic
const snapToEdge = () => {
  if (!mainElement.value) return

  const rect = mainElement.value.getBoundingClientRect()
  const windowWidth = window.innerWidth

  // Calculate distance to left and right edges
  const distanceToLeft = rect.left
  const distanceToRight = windowWidth - rect.right

  // Get current vertical position
  const currentY = rect.top
  // Get window height and element height
  const windowHeight = window.innerHeight
  const elementHeight = rect.height
  const elementWidth = rect.width
  
  // Calculate maximum allowed top value (ensure element doesn't exceed window bottom)
  const maxTop = Math.max(0, windowHeight - elementHeight)
  // Ensure top value is within reasonable range
  const clampedY = Math.min(windowHeight * 0.72, Math.min(currentY, maxTop))

  // Calculate current position information
  const position: MainPosition = {
    left: '0',
    right: '0',
    top: clampedY,
    width: elementWidth,
    height: elementHeight
  }

  // Decide which side to snap to
  if (distanceToLeft <= distanceToRight) {
    // Snap to left
    mainElement.value.style.left = '0px'
    mainElement.value.style.right = 'auto'
    position.left = '0'
    position.right = 'auto'
    leftOrRight.value = 'left'
  } else {
    // Snap to right
    mainElement.value.style.left = 'auto'
    mainElement.value.style.right = '0px'
    position.left = 'auto'
    position.right = '0'
    leftOrRight.value = 'right'
  }

  // Remove transform and set top value after boundary check
  mainElement.value.style.transform = 'none'

  // Snap to edge
  if(isMove.value){
    // Trigger drag end callback
    mainElement.value.style.top = `${clampedY}px`
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


// Mouse enter
const handleMouseEnter = () => {
  clearTimeout(showOfTimeTaskId.value)
  if(mainParam.value.appear === 'focus'){
    isMouseEnter.value = true
  }
}

// Mouse leave
const handleMouseLeave = () => {
  clearTimeout(showOfTimeTaskId.value)
  if(mainParam.value.appear === 'focus'){
    isMouseEnter.value = false
  }
}

// Event callback
const emitEvent = (name: keyof CallbackEntity, event: Event, position?: MainPosition) => {
  console.log('Event detected:', name)
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
    // Do not attempt to load list if initialization failed
  if(!userInfo.value.access_token || !listReqInfo.next){
    return
  }

  pageLoading()
  // Set to loading state
  if(tcId.value){
    // Load host list
    if(hostList.value.length > 0 && listReqInfo.next){
      // Indicates need to load next page
      listReqInfo.params.last_id = hostList.value[hostList.value.length - 1].id
    }

    // @ts-ignore
    getAvailableList(listReqInfo.params).then((res) => {
      console.log('Host list', res)

      // @ts-ignore
      if(hostList.value.length == 0 && res.data.hosts.length > 0){
        showOfTime(5000)
      }

      // @ts-ignore
      hostList.value = [...hostList.value, ...res.data.hosts]
      
      if(hostList.value.length > 0){
        pageSearch(`TC_ID: ${tcId.value}`)
        showList.value = true
      }
      
      // @ts-ignore
      if(hostList.value.length >= res.data.total){
        listReqInfo.next = false
      }
    }).catch(err => {
      pageClose('Load failed')
    })

  } else if(hostList.value.length == 0){
    // Load recoverable list
    getRetryList({user_id: userInfo.value.user.full_name}).then(res => {
      console.log('Host recoverable list', res)
      if(tcId.value){
        return
      }
      // @ts-ignore
      const hosts = res.data.hosts
      if(hosts && hosts.length > 0){
        hostList.value = hosts
        pageWarning('Pending connections detected')
        showOfTime(5000)
        showList.value = true
      } else {
        // Stop loading state
        pageNone()
        showList.value = false
      }
    }).catch(err => {
      if(tcId.value){
        return
      }
      pageClose('Load failed')
    })
  }
}


// Load host list
const hostListReload = () => {
  // Do not attempt to load list if initialization failed
  if(!userInfo.value.access_token){
    return
  }

  listReqInfo.next = true
  if(tcId.value){
    // Load host list
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
  setPageState('blue', 'loading', 'Loading', 'not-appear')
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

// Initialize after component mounts
onMounted(() => {
  // Initial check of list display position
  checkShowListPosition()
  // Listen to window resize, recheck position
  window.addEventListener('resize', checkShowListPosition)

  // Get user information and authenticate
  getUserInfo().then(res => {
    // @ts-ignore
    userAuth(res.original_user).then(res => {
      console.log('User authentication', res)
      // @ts-ignore
      userInfo.value = res
      // Get host list
      hostListReload()
    }).catch(err => {
      pageClose('Initialization failed')
    })
    console.log(res)
  }).catch(err => {
      pageClose('Initialization failed')
  })
})

// Report successful connection
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
      console.log('Connection success reported', res)
    }).catch(err => {
      console.log('Connection report failed', err)
    }).finally(() => {
      pageSearch(`TC_ID: ${tcId.value}`)
      isMouseEnter.value = false
      if(hostList.value.length > 0){
        showList.value = true
      }
    })
}


// Clean up event listeners when component unmounts
onUnmounted(() => {
  window.removeEventListener('resize', checkShowListPosition)
})

// Define methods to expose to external
defineExpose({

  /**
   * Register callback function
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

// Dynamic class definition

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
    <!-- Dynamically display host-list position based on conditions -->
    <host-list 
    :host-list="hostList"
    :is-tc="!!tcId"
    :is-show="isMouseEnter && !isMove && showList && hostList.length > 0"
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
    
    <!-- Display below by default -->
     
    <host-list 
    :host-list="hostList" 
    :is-tc="!!tcId" 
    :is-show="isMouseEnter && !isMove && showList && hostList.length > 0"
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
  top: 50%; /* Initial vertical position */
  right: 0; /* Initial horizontal position */
  background-color: white;
  color: white;
  cursor: grab;
  user-select: none;
  z-index: 999999;
  /* Adjust padding based on list position */
  padding: v-bind('showListAbove ? "0.5vh 0.5vh 0 0.5vh" : "0.5vh 0 0.5vh 0.5vh"');
  border-radius: 2.25vh 0 0 2.25vh;
  /* Add shadow effect */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);

  /* Add transition animation for smoother snapping */
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
