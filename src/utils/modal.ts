/**
 * Functional modal utility class
 * Provides pure function call method to avoid event conflicts from component imports
 */

interface ModalOptions {
  // Basic properties
  title?: string
  msg?: string
  
  // Confirm button related
  showConfirm?: boolean
  confirmText?: string
  onConfirm?: () => void
  
  // Cancel button related
  showCancel?: boolean
  cancelText?: string
  onCancel?: () => void
  
  // Mask related
  maskClosable?: boolean
}

/**
 * Create modal DOM element
 */
function createModalElement(options: ModalOptions): HTMLDivElement {
  const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const modalOverlay = document.createElement('div')
  modalOverlay.id = modalId
  modalOverlay.className = 'cpu-test-modal-overlay'
  if (options.maskClosable) {
    modalOverlay.classList.add('cpu-test-modal-overlay-clickable')
  }
  
  // Set styles
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000000;
    ${options.maskClosable ? 'cursor: pointer;' : ''}
  `
  
  // Create modal container
  const modalContainer = document.createElement('div')
  modalContainer.className = 'cpu-test-modal-container'
  modalContainer.style.cssText = `
    background-color: white;
    border-radius: 1.5vh;
    min-width: 30vh;
    max-width: 50vh;
    box-shadow: 0 2vh 4vh rgba(0, 0, 0, 0.2);
    cursor: default;
    animation: cpu-test-modal-fade-in 0.3s ease;
  `
  
  // Create header section
  const header = document.createElement('div')
  header.className = 'cpu-test-modal-header'
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2vh 2vh 1.5vh 2vh;
  `
  
  const title = document.createElement('div')
  title.className = 'cpu-test-modal-title'
  title.textContent = options.title || 'Prompt'
  title.style.cssText = `
    font-size: 1.8vh;
    font-weight: 600;
    color: #333;
    margin: 0;
  `
  
  const closeBtn = document.createElement('button')
  closeBtn.className = 'cpu-test-modal-close-btn'
  closeBtn.innerHTML = '×'
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 2.4vh;
    color: #999;
    cursor: pointer;
    width: 3vh;
    height: 3vh;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `
  
  // Create content section
  const content = document.createElement('div')
  content.className = 'cpu-test-modal-content'
  content.style.cssText = `
    padding: 1vh 3vh;
    min-height: 8vh;
    display: flex;
    align-items: center;
  `
  
  const message = document.createElement('div')
  message.className = 'cpu-test-modal-message'
  message.textContent = options.msg || ''
  message.style.cssText = `
    font-size: 1.5vh;
    color: #666;
    line-height: 1.6;
    text-align: left;
    width: 100%;
    word-wrap: break-word;
  `
  
  // Create footer section
  const footer = document.createElement('div')
  footer.className = 'cpu-test-modal-footer'
  footer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 1vh;
    padding: 1.5vh 2vh 2vh 2vh;
  `
  
  // Create cancel button
  let cancelBtn: HTMLButtonElement | null = null
  if (options.showCancel !== false) {
    cancelBtn = document.createElement('button')
    cancelBtn.className = 'cpu-test-modal-btn cpu-test-modal-cancel-btn'
    cancelBtn.textContent = options.cancelText || 'Cancel'
    cancelBtn.style.cssText = `
      padding: 0.8vh 2vh;
      border: none;
      border-radius: 0.8vh;
      font-size: 1.4vh;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 8vh;
      background-color: #f5f5f5;
      color: #666;
    `
  }
  
  // Create confirm button
  let confirmBtn: HTMLButtonElement | null = null
  if (options.showConfirm !== false) {
    confirmBtn = document.createElement('button')
    confirmBtn.className = 'cpu-test-modal-btn cpu-test-modal-confirm-btn'
    confirmBtn.textContent = options.confirmText || 'Confirm'
    confirmBtn.style.cssText = `
      padding: 0.8vh 2vh;
      border: none;
      border-radius: 0.8vh;
      font-size: 1.4vh;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 8vh;
      background-color: #2196f3;
      color: white;
    `
  }
  
  // Assemble DOM structure
  header.appendChild(title)
  header.appendChild(closeBtn)
  
  content.appendChild(message)
  
  if (cancelBtn) footer.appendChild(cancelBtn)
  if (confirmBtn) footer.appendChild(confirmBtn)
  
  modalContainer.appendChild(header)
  modalContainer.appendChild(content)
  modalContainer.appendChild(footer)
  
  modalOverlay.appendChild(modalContainer)
  
  return modalOverlay
}

/**
 * Show modal
 */
export function showModal(options: ModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const modalElement = createModalElement(options)
    
    // Get button elements
    const closeBtn = modalElement.querySelector('.cpu-test-modal-close-btn') as HTMLButtonElement
    const cancelBtn = modalElement.querySelector('.cpu-test-modal-cancel-btn') as HTMLButtonElement
    const confirmBtn = modalElement.querySelector('.cpu-test-modal-confirm-btn') as HTMLButtonElement
    
    // Close modal function
    const closeModal = (result: boolean) => {
      // Add fade-out animation
      modalElement.style.opacity = '0'
      modalElement.style.transform = 'scale(0.8) translateY(-2vh)'
      
      setTimeout(() => {
        if (modalElement.parentNode) {
          modalElement.parentNode.removeChild(modalElement)
        }
        resolve(result)
      }, 300)
    }
    
    // Event handling
    const handleMaskClick = (e: Event) => {
      if (options.maskClosable && e.target === modalElement) {
        if (options.onCancel) options.onCancel()
        closeModal(false)
      }
    }
    
    const handleClose = () => {
      if (options.onCancel) options.onCancel()
      closeModal(false)
    }
    
    const handleCancel = () => {
      if (options.onCancel) options.onCancel()
      closeModal(false)
    }
    
    const handleConfirm = () => {
      if (options.onConfirm) options.onConfirm()
      closeModal(true)
    }
    
    // Bind events
    modalElement.addEventListener('click', handleMaskClick)
    closeBtn?.addEventListener('click', handleClose)
    cancelBtn?.addEventListener('click', handleCancel)
    confirmBtn?.addEventListener('click', handleConfirm)
    
    // Add CSS animations
    const style = document.createElement('style')
    style.textContent = `
      @keyframes cpu-test-modal-fade-in {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-2vh);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .cpu-test-modal-btn:hover {
        transform: translateY(-0.1vh);
        box-shadow: 0 0.2vh 0.4vh rgba(0, 0, 0, 0.2);
      }
      
      .cpu-test-modal-btn:active {
        transform: translateY(0);
        box-shadow: none;
      }
      
      .cpu-test-modal-cancel-btn:hover {
        background-color: #e0e0e0 !important;
      }
      
      .cpu-test-modal-confirm-btn:hover {
        background-color: #1976d2 !important;
      }
      
      .cpu-test-modal-close-btn:hover {
        background-color: #f5f5f5 !important;
        color: #666 !important;
      }
      
      .cpu-test-modal-close-btn:active {
        background-color: #e0e0e0 !important;
      }
    `
    document.head.appendChild(style)
    
    // Add to page
    document.body.appendChild(modalElement)
    
    // Return close function to allow external control
    return {
      close: () => closeModal(false)
    }
  })
}

/**
 * Confirmation modal shortcut method
 */
export function confirm(msg: string, title: string = 'Confirm Operation'): Promise<boolean> {
  return showModal({
    title,
    msg,
    showConfirm: true,
    confirmText: 'Confirm',
    showCancel: true,
    cancelText: 'Cancel',
    maskClosable: false
  })
}

/**
 * Alert modal shortcut method
 */
export function alert(msg: string, title: string = 'Prompt'): Promise<void> {
  return new Promise((resolve) => {
    showModal({
      title,
      msg,
      showConfirm: true,
      confirmText: 'Confirm',
      showCancel: false,
      maskClosable: false,
      onConfirm: () => resolve()
    })
  })
}