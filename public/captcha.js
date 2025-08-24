/**
 * 人机验证组件
 * 支持 Google reCAPTCHA 和 Cloudflare Turnstile
 * 开发环境默认禁用
 */
class CaptchaManager {
  constructor(options = {}) {
    this.provider = options.provider || 'recaptcha'; // 'recaptcha' 或 'turnstile'
    this.siteKey = options.siteKey || '';
    this.enabled = options.enabled !== false; // 默认启用，除非明确设置为false
    this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.widgetId = null;
    this.containerId = options.containerId || 'captcha-container';
    
    // 开发环境自动禁用
    if (this.isDevelopment) {
      this.enabled = false;
      console.log('[Captcha] 开发环境检测到，人机验证已禁用');
    }
    
    this.init();
  }

  /**
   * 初始化验证码
   */
  async init() {
    if (!this.enabled) {
      this.createDisabledPlaceholder();
      return;
    }

    if (!this.siteKey) {
      console.error('[Captcha] 缺少站点密钥');
      return;
    }

    try {
      await this.loadScript();
      this.render();
    } catch (error) {
      console.error('[Captcha] 初始化失败:', error);
      this.createErrorPlaceholder();
    }
  }

  /**
   * 加载验证码脚本
   */
  loadScript() {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      if (this.isScriptLoaded()) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      
      if (this.provider === 'recaptcha') {
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.onload = () => {
          if (window.grecaptcha) {
            resolve();
          } else {
            reject(new Error('reCAPTCHA 加载失败'));
          }
        };
      } else if (this.provider === 'turnstile') {
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.onload = () => {
          if (window.turnstile) {
            resolve();
          } else {
            reject(new Error('Turnstile 加载失败'));
          }
        };
      } else {
        reject(new Error('不支持的验证码提供商'));
        return;
      }

      script.onerror = () => reject(new Error('验证码脚本加载失败'));
      document.head.appendChild(script);
    });
  }

  /**
   * 检查脚本是否已加载
   */
  isScriptLoaded() {
    if (this.provider === 'recaptcha') {
      return typeof window.grecaptcha !== 'undefined';
    } else if (this.provider === 'turnstile') {
      return typeof window.turnstile !== 'undefined';
    }
    return false;
  }

  /**
   * 渲染验证码
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`[Captcha] 找不到容器元素: ${this.containerId}`);
      return;
    }

    try {
      if (this.provider === 'recaptcha') {
        this.widgetId = window.grecaptcha.render(container, {
          sitekey: this.siteKey,
          callback: this.onSuccess.bind(this),
          'expired-callback': this.onExpired.bind(this),
          'error-callback': this.onError.bind(this)
        });
      } else if (this.provider === 'turnstile') {
        this.widgetId = window.turnstile.render(container, {
          sitekey: this.siteKey,
          callback: this.onSuccess.bind(this),
          'expired-callback': this.onExpired.bind(this),
          'error-callback': this.onError.bind(this)
        });
      }
    } catch (error) {
      console.error('[Captcha] 渲染失败:', error);
      this.createErrorPlaceholder();
    }
  }

  /**
   * 获取验证码响应
   */
  getResponse() {
    if (!this.enabled) {
      return 'dev-bypass'; // 开发环境绕过标识
    }

    if (!this.widgetId) {
      return null;
    }

    try {
      if (this.provider === 'recaptcha') {
        return window.grecaptcha.getResponse(this.widgetId);
      } else if (this.provider === 'turnstile') {
        return window.turnstile.getResponse(this.widgetId);
      }
    } catch (error) {
      console.error('[Captcha] 获取响应失败:', error);
      return null;
    }
  }

  /**
   * 重置验证码
   */
  reset() {
    if (!this.enabled || !this.widgetId) {
      return;
    }

    try {
      if (this.provider === 'recaptcha') {
        window.grecaptcha.reset(this.widgetId);
      } else if (this.provider === 'turnstile') {
        window.turnstile.reset(this.widgetId);
      }
    } catch (error) {
      console.error('[Captcha] 重置失败:', error);
    }
  }

  /**
   * 验证成功回调
   */
  onSuccess(token) {
    console.log('[Captcha] 验证成功');
    // 触发自定义事件
    document.dispatchEvent(new CustomEvent('captcha:success', {
      detail: { token, provider: this.provider }
    }));
  }

  /**
   * 验证过期回调
   */
  onExpired() {
    console.log('[Captcha] 验证已过期');
    document.dispatchEvent(new CustomEvent('captcha:expired', {
      detail: { provider: this.provider }
    }));
  }

  /**
   * 验证错误回调
   */
  onError(error) {
    console.error('[Captcha] 验证错误:', error);
    
    // 显示用户友好的错误信息
    this.showErrorMessage('验证码加载失败，请刷新页面重试');
    
    document.dispatchEvent(new CustomEvent('captcha:error', {
      detail: { error, provider: this.provider }
    }));
  }

  /**
   * 显示错误信息
   */
  showErrorMessage(message) {
    const container = document.getElementById(this.containerId);
    if (container) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'captcha-error-message';
      errorDiv.innerHTML = `
        <div style="color: #dc3545; padding: 10px; border: 1px solid #dc3545; border-radius: 4px; margin: 10px 0; background-color: #f8d7da;">
          <i class="fas fa-exclamation-triangle"></i>
          <span>${message}</span>
          <button type="button" onclick="location.reload()" style="margin-left: 10px; padding: 2px 8px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">重新加载</button>
        </div>
      `;
      
      // 移除之前的错误信息
      const existingError = container.querySelector('.captcha-error-message');
      if (existingError) {
        existingError.remove();
      }
      
      container.appendChild(errorDiv);
    }
  }

  /**
   * 创建禁用状态占位符
   */
  createDisabledPlaceholder() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = `
        <div class="captcha-disabled">
          <i class="fas fa-code"></i>
          <span>开发环境 - 人机验证已禁用</span>
        </div>
      `;
    }
  }

  /**
   * 创建错误状态占位符
   */
  createErrorPlaceholder() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = `
        <div class="captcha-error">
          <i class="fas fa-exclamation-triangle"></i>
          <span>人机验证加载失败</span>
          <button type="button" onclick="location.reload()" class="btn btn-sm secondary">重新加载</button>
        </div>
      `;
    }
  }

  /**
   * 销毁验证码实例
   */
  destroy() {
    if (this.widgetId) {
      try {
        if (this.provider === 'recaptcha' && window.grecaptcha) {
          // reCAPTCHA 没有直接的销毁方法，重置即可
          window.grecaptcha.reset(this.widgetId);
        } else if (this.provider === 'turnstile' && window.turnstile) {
          window.turnstile.remove(this.widgetId);
        }
      } catch (error) {
        console.error('[Captcha] 销毁失败:', error);
      }
      this.widgetId = null;
    }
  }
}

// 全局实例
window.CaptchaManager = CaptchaManager;

// 便捷方法
window.initCaptcha = function(options) {
  return new CaptchaManager(options);
};

// 验证表单提交时的验证码
window.validateCaptcha = function(captchaInstance) {
  if (!captchaInstance) {
    console.error('[Captcha] 验证码实例不存在');
    return false;
  }

  const response = captchaInstance.getResponse();
  
  if (!captchaInstance.enabled) {
    return true; // 开发环境绕过验证
  }

  if (!response) {
    alert('请完成人机验证');
    return false;
  }

  return true;
};