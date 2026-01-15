// Global message notification utility
// Provides notification methods that can be called from anywhere in the project, following responsive design principles

// Ensure TypeScript recognizes CSSStyleDeclarationInit type
type CSSStyleDeclarationInit = Partial<CSSStyleDeclaration>;

// Notification type enumeration
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

// Notification configuration interface
export interface NotificationConfig {
  type?: NotificationType;
  duration?: number; // Display duration in milliseconds, default 3000
  showClose?: boolean; // Whether to show close button, default true
  onClick?: () => void; // Click notification callback
}

// Notification manager class
class NotificationManager {
  private container: HTMLElement | null = null;
  private notificationStack: HTMLElement[] = [];
  private readonly DEFAULT_DURATION = 3000;
  private readonly MIN_GAP = 0.5; // Minimum gap between notifications, unit vh

  constructor() {
    this.initContainer();
  }

  // Initialize notification container
  private initContainer(): void {
    // Check if container already exists
    if (this.container) return;

    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    
    // Add container styles - 2vh from top, horizontally centered
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '9999',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '2vh' // 2vh from top
    });

    // Add to document
    document.body.appendChild(this.container);
  }

  // Create single notification element
  private createNotificationElement(message: string, config: NotificationConfig): HTMLElement {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${config.type || NotificationType.INFO}`;
    
    // Set notification content
    notification.textContent = message;

    // Base styles - using vh units to ensure style consistency
    const baseStyles: CSSStyleDeclarationInit = {
      pointerEvents: 'auto',
      maxWidth: '80vw', // Maximum width 80vw
      width: 'auto',
      minWidth: '10vh',
      padding: '1vh 2vh', // Padding using vh
      marginBottom: `${this.MIN_GAP}vh`, // Spacing using vh
      fontSize: '2vh', // Font size using vh
      fontWeight: 'normal',
      lineHeight: '1.5',
      borderRadius: '1vh', // Border radius using vh
      boxShadow: '0 0.5vh 2vh rgba(0, 0, 0, 0.2)', // Shadow using vh
      wordWrap: 'break-word', // Text can wrap
      whiteSpace: 'pre-wrap',
      transition: 'all 0.3s ease',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      color: '#333',
      border: 'none',
      textAlign: 'center',
      opacity: '0',
      transform: 'translateY(-1vh)'
    };

    // Set different styles based on type
    const typeStyles = this.getTypeStyles(config.type || NotificationType.INFO);
    Object.assign(notification.style, baseStyles, typeStyles);

    // If close button is needed
    if (config.showClose === true) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.textContent = '×';
      
      Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '0.5vh', // Using vh
        right: '0.5vh', // Using vh
        width: '2.5vh', // Using vh
        height: '2.5vh', // Using vh
        padding: '0',
        fontSize: '2vh', // Using vh
        fontWeight: 'bold',
        lineHeight: '1',
        color: 'inherit',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        opacity: '0.7',
        transition: 'opacity 0.2s ease'
      });

      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.opacity = '1';
      });

      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.opacity = '0.7';
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeNotification(notification);
      });

      notification.appendChild(closeBtn);
    }

    // Add click event
    if (config.onClick) {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', config.onClick);
    }

    return notification;
  }

  // Get styles for different types
  private getTypeStyles(type: NotificationType): CSSStyleDeclarationInit {
    switch (type) {
      case NotificationType.SUCCESS:
        return {
          backgroundColor: 'rgba(240, 249, 235, 0.95)',
          color: '#13c2c2',
          borderLeft: '1vh solid #13c2c2' // Using vh
        };
      case NotificationType.WARNING:
        return {
          backgroundColor: 'rgba(253, 246, 236, 0.95)',
          color: '#fa8c16',
          borderLeft: '1vh solid #fa8c16' // Using vh
        };
      case NotificationType.ERROR:
        return {
          backgroundColor: 'rgba(254, 240, 240, 0.95)',
          color: '#f5222d',
          borderLeft: '1vh solid #f5222d' // Using vh
        };
      case NotificationType.INFO:
      default:
        return {
          backgroundColor: 'rgba(240, 242, 245, 0.95)',
          color: '#1890ff',
          borderLeft: '1vh solid #1890ff' // Using vh
        };
    }
  }

  // Show notification
  private showNotification(notification: HTMLElement): void {
    // Add to container
    if (this.container) {
      this.container.appendChild(notification);
      this.notificationStack.push(notification);

      // Add animation after forced reflow
      setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
      }, 0);
    }
  }

  // Remove notification
  private removeNotification(notification: HTMLElement): void {
    // Animation effect
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-1vh)';

    // Remove after animation ends
    setTimeout(() => {
      if (this.container && notification.parentNode === this.container) {
        this.container.removeChild(notification);
      }
      
      // Remove from stack
      const index = this.notificationStack.indexOf(notification);
      if (index > -1) {
        this.notificationStack.splice(index, 1);
      }
    }, 300);
  }

  // Notification method
  public notify(message: string, config: NotificationConfig = {}): void {
    // Ensure execution after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.showNotificationWithTimer(message, config);
      });
    } else {
      this.showNotificationWithTimer(message, config);
    }
  }

  // Show notification and set timer
  private showNotificationWithTimer(message: string, config: NotificationConfig): void {
    const notification = this.createNotificationElement(message, config);
    this.showNotification(notification);

    // Set auto-close timer
    if (config.duration !== 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, config.duration || this.DEFAULT_DURATION);
    }
  }

  // Specific type notification methods
  public info(message: string, config: Omit<NotificationConfig, 'type'> = {}): void {
    this.notify(message, { ...config, type: NotificationType.INFO });
  }

  public success(message: string, config: Omit<NotificationConfig, 'type'> = {}): void {
    this.notify(message, { ...config, type: NotificationType.SUCCESS });
  }

  public warning(message: string, config: Omit<NotificationConfig, 'type'> = {}): void {
    this.notify(message, { ...config, type: NotificationType.WARNING });
  }

  public error(message: string, config: Omit<NotificationConfig, 'type'> = {}): void {
    this.notify(message, { ...config, type: NotificationType.ERROR });
  }

  // Clear all notifications
  public clearAll(): void {
    this.notificationStack.forEach(notification => {
      this.removeNotification(notification);
    });
    this.notificationStack = [];
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

// Export notification methods
export const notify = notificationManager.notify.bind(notificationManager);
export const info = notificationManager.info.bind(notificationManager);
export const success = notificationManager.success.bind(notificationManager);
export const warning = notificationManager.warning.bind(notificationManager);
export const error = notificationManager.error.bind(notificationManager);
export const clearAll = notificationManager.clearAll.bind(notificationManager);

// Export default object
export default notificationManager;

// Usage examples
/*
// Import notification utility
import notification, { info, success, warning, error } from './utils/notification';

// Basic usage
info('This is an info message');
success('Operation successful!');
warning('Warning message');
error('Error message');

// Custom configuration
notification.notify('Custom notification', {
  type: NotificationType.SUCCESS,
  duration: 5000,
  showClose: true,
  onClick: () => {
    console.log('Notification clicked');
  }
});

// Clear all notifications
notification.clearAll();
*/