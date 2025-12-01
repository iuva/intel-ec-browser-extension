// content.ts
import Main from './components/main.vue'
import { createApp } from 'vue'

// 创建一个 div 元素用于挂载 Vue 应用
const appContainer = document.createElement('div')
appContainer.id = 'cpu-test-extension-container'
appContainer.style.position = 'fixed'
appContainer.style.top = '0'
appContainer.style.left = '0'
appContainer.style.zIndex = '999999'
appContainer.style.width = '0'
appContainer.style.height = '0'

document.body.appendChild(appContainer)

// 保存Vue应用实例的引用
const appInstance = createApp(Main).mount(appContainer)

// 根据错误提示，appInstance 上不存在 registerCallback 属性，推测需要确保 appInstance 有该方法后再调用
if ('registerCallback' in appInstance) {
    (appInstance as any).registerCallback({
        click: (event?: Event) => {
            console.log('组件获得焦点', event)
            // if ('setParam' in appInstance) {
            //     (appInstance as any).setParam({
            //         background: 'warning',
            //         borderRadius: 'bottom',
            //         icon: 'none',
            //         appear: 'not-appear',
            //     })
            // }
        }
    })
}

