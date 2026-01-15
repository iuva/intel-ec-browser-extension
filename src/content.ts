// content.ts
import Main from './components/main.vue'
import { createApp } from 'vue'

// Create a div element to mount the Vue application
const appContainer = document.createElement('div')
appContainer.id = 'cpu-test-extension-container'
appContainer.style.position = 'fixed'
appContainer.style.top = '0'
appContainer.style.left = '0'
appContainer.style.zIndex = '999999'
appContainer.style.width = '0'
appContainer.style.height = '0'

document.body.appendChild(appContainer)

// Save reference to the Vue application instance
const appInstance = createApp(Main).mount(appContainer)

// Based on the error message, the registerCallback property does not exist on appInstance,
// so we need to ensure appInstance has this method before calling it
if ('registerCallback' in appInstance) {
    (appInstance as any).registerCallback({
        click: (event?: Event) => {
            console.log('Component gained focus', event)
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

