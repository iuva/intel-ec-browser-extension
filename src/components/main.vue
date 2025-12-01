<!-- main.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { CallbackEntity, MainPosition, MainParam } from '/@/entity/main'
import HostList from './hostList.vue'
import { getUserInfo } from '/@/api/auth'
import { getRetryList, getAvailableList } from '/@/api/host'

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
  userId: '',
  userName: '',
})

const hostList = ref([])

const monitorHost = ['hsdes-pre.intel.com', 'hsdes.intel.com']

// 监听路由变化，以修改是否处于可抓取 tc_id 的状态
const observeUrlChanges = () => {
  if(monitorHost.concat(location.hostname)){
    console.log('路由变化', location)
    if(location.pathname.startsWith('/appstore/phonenix/execution')){
      mainParam.value.isTc = true
    }
  }
};

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
    
    // 检查是否有路由相关的属性变化
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'class' || mutation.attributeName === 'data-route')) {
      observeUrlChanges();
    }
  });
});

// 开始观察整个文档的变化
urlObserver.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'data-route', 'href']
});

// 设置轮询检查（作为备用方案）
let lastUrl = location.href;
const urlPolling = setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    observeUrlChanges();
  }
}, 1000); // 每秒检查一次

// 清理函数（如果需要）
const cleanupUrlListeners = () => {
  window.removeEventListener('popstate', observeUrlChanges);
  window.removeEventListener('hashchange', observeUrlChanges);
  urlObserver.disconnect();
  clearInterval(urlPolling);
};

// 初始调用一次
observeUrlChanges();

// ==================== 监听页面变化和抓取单选框功能 ====================

// 监听页面变化的MutationObserver
let pageObserver: MutationObserver | null = null;
// 抓取定时器
let captureTimer: number | null = null;
// 当前抓取状态
let isCapturing = false;
// 上次抓取到的内容
let lastCapturedContent = '';
// 当前单选框状态
let currentRadioState = '';

/**
 * 获取页面所有单选框（排除插件自身）
 */
const getAllRadios = (): NodeListOf<HTMLInputElement> => {
  // 获取页面所有input[type="radio"]元素
  const allRadios = document.querySelectorAll('input[type="radio"]');
  
  // 过滤掉插件自身的单选框
  const filteredRadios = Array.from(allRadios).filter(radio => {
    // 检查是否在插件容器内
    const isInExtension = radio.closest('.cpu-test-browser-extension-main') !== null;
    return !isInExtension;
  });
  // @ts-ignore
  return filteredRadios as NodeListOf<HTMLInputElement>;
};

/**
 * 获取当前单选框状态（选中的值）
 */
const getCurrentRadioState = (): string => {
  const radios = getAllRadios();
  const checkedRadios = Array.from(radios).filter(radio => radio.checked);
  
  if (checkedRadios.length === 0) {
    return '';
  }
  
  // 返回选中的单选框信息（name:value格式）
  return checkedRadios.map(radio => `${radio.name}:${radio.value}`).join('|');
};

/**
 * 抓取 .record-hierarchy-container[0] 的内容
 */
const captureRecordHierarchyContent = (): string => {
  try {
    const container = document.querySelector('.record-hierarchy-container');
    if (!container) {
      return '';
    }
    
    // 获取容器内容（文本内容或HTML内容）
    const content = container.textContent?.trim() || container.innerHTML.trim();
    return content;
  } catch (error) {
    console.error('抓取 .record-hierarchy-container 内容失败:', error);
    return '';
  }
};

/**
 * 开始抓取过程
 */
const startCapture = () => {
  if (isCapturing) {
    return;
  }
  
  isCapturing = true;
  console.log('开始抓取页面内容...');
  
  // 初始抓取一次
  performCapture();
  
  // 设置200毫秒间隔的抓取定时器
  captureTimer = window.setInterval(() => {
    if (!mainParam.value.isTc) {
      stopCapture();
      return;
    }
    
    performCapture();
  }, 200);
};

/**
 * 执行单次抓取操作
 */
const performCapture = () => {
  // 检查结束条件1：mainParam.value.isTc为false
  if (!mainParam.value.isTc) {
    stopCapture();
    return;
  }
  
  // 检查结束条件2：单选框状态发生变化
  const newRadioState = getCurrentRadioState();
  if (newRadioState !== currentRadioState) {
    console.log('单选框状态发生变化:', { old: currentRadioState, new: newRadioState });
    currentRadioState = newRadioState;
    // 单选框变化时也停止抓取
    stopCapture();
    return;
  }
  
  // 抓取内容
  const content = captureRecordHierarchyContent();
  
  // 检查结束条件3：抓取到了内容
  if (content && content !== lastCapturedContent) {
    console.log('抓取到新内容:', content);
    stopCapture();
    // 从当前url 中提取 cycle 参数
    const urlParams = new URLSearchParams(window.location.search);
    const cycle = urlParams.get('cycle');
    hostList.value = []

    getAvailableList({
      tc_id: content,
      cycle_name: cycle,
      user_name: userInfo.value.userName,
      page_size: 20,
      last_id: '',
    }).then(res => {
      // @ts-ignore
      const hosts = res.data.hosts
      if(hosts && hosts.length > 0){
        hostList.value = hosts
      }
    })

    return;
  }
  
  // 更新最后抓取的内容
  lastCapturedContent = content;
};

/**
 * 停止抓取过程
 */
const stopCapture = () => {
  if (!isCapturing) {
    return;
  }
  
  isCapturing = false;
  
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
  
  console.log('停止抓取页面内容');
  
  // 重置状态
  lastCapturedContent = '';
  currentRadioState = '';
};

/**
 * 初始化页面变化监听
 */
const initPageObserver = () => {
  if (pageObserver) {
    pageObserver.disconnect();
  }
  
  pageObserver = new MutationObserver((mutations) => {
    // 检查是否有单选框相关的DOM变化
    const hasRadioChanges = mutations.some(mutation => {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLInputElement) {
        return mutation.target.type === 'radio' && mutation.attributeName === 'checked';
      }
      
      if (mutation.type === 'childList') {
        // 检查新增或移除的节点中是否有单选框
        const addedRadios = Array.from(mutation.addedNodes).some(node => 
          node instanceof HTMLInputElement && node.type === 'radio'
        );
        const removedRadios = Array.from(mutation.removedNodes).some(node => 
          node instanceof HTMLInputElement && node.type === 'radio'
        );
        return addedRadios || removedRadios;
      }
      
      return false;
    });
    
    if (hasRadioChanges && mainParam.value.isTc && !isCapturing) {
      // 单选框发生变化且处于TC模式，开始抓取
      startCapture();
    }
  });
  
  // 开始观察整个文档的变化
  pageObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['checked']
  });
};

/**
 * 清理页面监听器
 */
const cleanupPageObserver = () => {
  if (pageObserver) {
    pageObserver.disconnect();
    pageObserver = null;
  }
  
  stopCapture();
};

// 监听mainParam.isTc的变化
watch(() => mainParam.value.isTc, (newValue, oldValue) => {
  if (newValue && !oldValue) {
    // isTc从false变为true，初始化监听
    initPageObserver();
    
    // 获取当前单选框状态
    currentRadioState = getCurrentRadioState();
    
    // 如果已经有选中的单选框，开始抓取
    if (currentRadioState) {
      startCapture();
    }
  } else if (!newValue && oldValue) {
    // isTc从true变为false，清理监听
    cleanupPageObserver();
  }
});

// 组件挂载时，如果isTc为true，初始化监听
onMounted(() => {
  if (mainParam.value.isTc) {
    initPageObserver();
    currentRadioState = getCurrentRadioState();
    
    if (currentRadioState) {
      startCapture();
    }
  }
});

// 组件卸载时清理监听器
onUnmounted(() => {
  cleanupPageObserver();
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
  
  const rect = mainElement.value.getBoundingClientRect()
  const windowHeight = window.innerHeight
  // 计算距离底部的距离
  const distanceToBottom = windowHeight - rect.bottom
  
  // 如果距离底部不足20vh，则显示在上方
  showListAbove.value = distanceToBottom < 20 * window.innerHeight / 100
}

// 拖拽结束
const handleMouseUp = () => {
  isDragging.value = false

  // 移除事件监听器
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  setTimeout(() => {
    snapToEdge()
    // 检查列表应该显示的位置
    checkShowListPosition()
    isMove.value = false
  }, 50)
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
  const clampedY = Math.max(0, Math.min(currentY, maxTop))

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

// 鼠标移入
const handleMouseEnter = () => {
  if(mainParam.value.appear === 'focus'){
    isMouseEnter.value = true
  }
}

// 鼠标移出
const handleMouseLeave = () => {
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


// 组件挂载后初始化
onMounted(() => {
  // 初始检查列表显示位置
  checkShowListPosition()
  // 监听窗口大小变化，重新检查位置
  window.addEventListener('resize', checkShowListPosition)

  // 获取用户信息并鉴权
  getUserInfo().then(res => {
    // @ts-ignore
    const data = res.data
    const personal = data.personal[0]
    userInfo.value = {
      userId: data.user,
      userName: personal.full_name,
    }

    // TODO 缺少userId 鉴权逻辑
    
    // 获取可恢复的主机列表
    getRetryList({user_id: userInfo.value.userId}).then(res => {
      console.log('host 可恢复列表', res)
      // @ts-ignore
      const hosts = res.data.hosts
      if(hosts && hosts.length > 0){
        hostList.value = hosts
        mainParam.value.background = 'blue'
        mainParam.value.icon = 'warning'
        mainParam.value.text = '检测到您有待恢复的连接'
      } else {
        // 停止加载中状态
        mainParam.value.icon = 'none'
      }
    })
    console.log(res)
  }).catch(err => {
      mainParam.value.background = 'warning'
      mainParam.value.icon = 'close'
      mainParam.value.text = '初始化失败'
  })






})

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
    <host-list :host-list="hostList" :is-tc="mainParam.isTc" v-if="showListAbove && !isMove && showList"></host-list>
    
    <div 
    class="cpu-test-browser-extension-main-content" 
    :class="mainConClass"
    >
      <div class="main-content-icon">
        <div class="icon main-content-icon-close" v-if="mainParam.icon === 'close'">
          ×
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
    <host-list :host-list="hostList" :is-tc="mainParam.isTc" v-if="!showListAbove && !isMove && showList"></host-list>
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

  /* 添加过渡动画使吸附更平滑 */
  // transition: left 0.5s ease, right 0.5s ease;

  &:active {
    cursor: grabbing;
  }

  .cpu-test-browser-extension-main-content {
    display: flex;
    align-items: center;
    height: 4vh;
    background-color: #00B0F0;
    border-radius: 2vh 0 0 2vh;
    font-size: 1.4vh;

    .main-content-icon{
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
        font-size: 3vh;
        text-align: center;
        line-height: 2vh;
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
