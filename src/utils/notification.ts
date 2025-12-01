// 全局消息通知工具
// 提供可在项目任意位置调用的通知方法，遵循响应式设计原则

// 确保TypeScript识别CSSStyleDeclarationInit类型
type CSSStyleDeclarationInit = Partial<CSSStyleDeclaration>;

// 通知类型枚举
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

// 通知配置接口
export interface NotificationConfig {
  type?: NotificationType;
  duration?: number; // 显示时长，单位毫秒，默认3000
  showClose?: boolean; // 是否显示关闭按钮，默认true
  onClick?: () => void; // 点击通知回调
}

// 通知管理器类
class NotificationManager {
  private container: HTMLElement | null = null;
  private notificationStack: HTMLElement[] = [];
  private readonly DEFAULT_DURATION = 3000;
  private readonly MIN_GAP = 0.5; // 通知之间的最小间隔，单位vh

  constructor() {
    this.initContainer();
  }

  // 初始化通知容器
  private initContainer(): void {
    // 检查容器是否已存在
    if (this.container) return;

    // 创建容器元素
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    
    // 添加容器样式 - 距离顶部2vh，横向居中
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
      paddingTop: '2vh' // 距离顶部2vh
    });

    // 添加到文档中
    document.body.appendChild(this.container);
  }

  // 创建单个通知元素
  private createNotificationElement(message: string, config: NotificationConfig): HTMLElement {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${config.type || NotificationType.INFO}`;
    
    // 设置通知内容
    notification.textContent = message;

    // 基础样式 - 使用vh单位确保样式一致性
    const baseStyles: CSSStyleDeclarationInit = {
      pointerEvents: 'auto',
      maxWidth: '80vw', // 最大宽度80vw
      width: 'auto',
      minWidth: '10vh',
      padding: '1vh 2vh', // 内边距使用vh
      marginBottom: `${this.MIN_GAP}vh`, // 间距使用vh
      fontSize: '2vh', // 字号使用vh
      fontWeight: 'normal',
      lineHeight: '1.5',
      borderRadius: '1vh', // 圆角使用vh
      boxShadow: '0 0.5vh 2vh rgba(0, 0, 0, 0.2)', // 阴影使用vh
      wordWrap: 'break-word', // 文字可折行
      whiteSpace: 'pre-wrap',
      transition: 'all 0.3s ease',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      color: '#333',
      border: 'none',
      textAlign: 'center',
      opacity: '0',
      transform: 'translateY(-1vh)'
    };

    // 根据类型设置不同样式
    const typeStyles = this.getTypeStyles(config.type || NotificationType.INFO);
    Object.assign(notification.style, baseStyles, typeStyles);

    // 如果需要关闭按钮
    if (config.showClose === true) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.textContent = '×';
      
      Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '0.5vh', // 使用vh
        right: '0.5vh', // 使用vh
        width: '2.5vh', // 使用vh
        height: '2.5vh', // 使用vh
        padding: '0',
        fontSize: '2vh', // 使用vh
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

    // 添加点击事件
    if (config.onClick) {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', config.onClick);
    }

    return notification;
  }

  // 获取不同类型的样式
  private getTypeStyles(type: NotificationType): CSSStyleDeclarationInit {
    switch (type) {
      case NotificationType.SUCCESS:
        return {
          backgroundColor: 'rgba(240, 249, 235, 0.95)',
          color: '#13c2c2',
          borderLeft: '1vh solid #13c2c2' // 使用vh
        };
      case NotificationType.WARNING:
        return {
          backgroundColor: 'rgba(253, 246, 236, 0.95)',
          color: '#fa8c16',
          borderLeft: '1vh solid #fa8c16' // 使用vh
        };
      case NotificationType.ERROR:
        return {
          backgroundColor: 'rgba(254, 240, 240, 0.95)',
          color: '#f5222d',
          borderLeft: '1vh solid #f5222d' // 使用vh
        };
      case NotificationType.INFO:
      default:
        return {
          backgroundColor: 'rgba(240, 242, 245, 0.95)',
          color: '#1890ff',
          borderLeft: '1vh solid #1890ff' // 使用vh
        };
    }
  }

  // 显示通知
  private showNotification(notification: HTMLElement): void {
    // 添加到容器
    if (this.container) {
      this.container.appendChild(notification);
      this.notificationStack.push(notification);

      // 强制重排后添加动画
      setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
      }, 0);
    }
  }

  // 移除通知
  private removeNotification(notification: HTMLElement): void {
    // 动画效果
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-1vh)';

    // 动画结束后移除
    setTimeout(() => {
      if (this.container && notification.parentNode === this.container) {
        this.container.removeChild(notification);
      }
      
      // 从栈中移除
      const index = this.notificationStack.indexOf(notification);
      if (index > -1) {
        this.notificationStack.splice(index, 1);
      }
    }, 300);
  }

  // 通知方法
  public notify(message: string, config: NotificationConfig = {}): void {
    // 确保在DOM加载完成后执行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.showNotificationWithTimer(message, config);
      });
    } else {
      this.showNotificationWithTimer(message, config);
    }
  }

  // 显示通知并设置定时器
  private showNotificationWithTimer(message: string, config: NotificationConfig): void {
    const notification = this.createNotificationElement(message, config);
    this.showNotification(notification);

    // 设置自动关闭定时器
    if (config.duration !== 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, config.duration || this.DEFAULT_DURATION);
    }
  }

  // 特定类型的通知方法
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

  // 清除所有通知
  public clearAll(): void {
    this.notificationStack.forEach(notification => {
      this.removeNotification(notification);
    });
    this.notificationStack = [];
  }
}

// 创建单例实例
const notificationManager = new NotificationManager();

// 导出通知方法
export const notify = notificationManager.notify.bind(notificationManager);
export const info = notificationManager.info.bind(notificationManager);
export const success = notificationManager.success.bind(notificationManager);
export const warning = notificationManager.warning.bind(notificationManager);
export const error = notificationManager.error.bind(notificationManager);
export const clearAll = notificationManager.clearAll.bind(notificationManager);

// 导出默认对象
export default notificationManager;

// 使用示例
/*
// 引入通知工具
import notification, { info, success, warning, error } from './utils/notification';

// 基本使用
info('这是一条提示信息');
success('操作成功！');
warning('警告信息');
error('错误信息');

// 自定义配置
notification.notify('自定义通知', {
  type: NotificationType.SUCCESS,
  duration: 5000,
  showClose: true,
  onClick: () => {
    console.log('通知被点击');
  }
});

// 清除所有通知
notification.clearAll();
*/