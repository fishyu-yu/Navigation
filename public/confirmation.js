// 确认弹窗组件
class ConfirmationDialog {
  constructor() {
    this.overlay = null;
    this.dialog = null;
    this.resolveCallback = null;
    this.init();
  }

  init() {
    // 创建弹窗HTML结构
    this.createDialog();
    
    // 绑定事件
    this.bindEvents();
  }

  createDialog() {
    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'confirmation-overlay';
    
    // 创建弹窗
    this.dialog = document.createElement('div');
    this.dialog.className = 'confirmation-dialog';
    
    this.dialog.innerHTML = `
      <div class="confirmation-header">
        <h3 class="confirmation-title">确认操作</h3>
      </div>
      <div class="confirmation-body">
        <div class="confirmation-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <p class="confirmation-message">您确定要执行此操作吗？</p>
      </div>
      <div class="confirmation-footer">
        <button class="btn btn-secondary confirmation-cancel">取消</button>
        <button class="btn btn-danger confirmation-confirm">确认</button>
      </div>
    `;
    
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    
    // 默认隐藏
    this.overlay.style.display = 'none';
  }

  bindEvents() {
    // 点击遮罩层关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close(false);
      }
    });
    
    // 取消按钮
    this.dialog.querySelector('.confirmation-cancel').addEventListener('click', () => {
      this.close(false);
    });
    
    // 确认按钮
    this.dialog.querySelector('.confirmation-confirm').addEventListener('click', () => {
      this.close(true);
    });
    
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
        this.close(false);
      }
    });
  }

  show(options = {}) {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      
      // 更新内容
      const title = options.title || '确认操作';
      const message = options.message || '您确定要执行此操作吗？';
      const confirmText = options.confirmText || '确认';
      const cancelText = options.cancelText || '取消';
      const type = options.type || 'warning'; // warning, danger, info
      
      this.dialog.querySelector('.confirmation-title').textContent = title;
      this.dialog.querySelector('.confirmation-message').textContent = message;
      this.dialog.querySelector('.confirmation-confirm').textContent = confirmText;
      this.dialog.querySelector('.confirmation-cancel').textContent = cancelText;
      
      // 设置图标和样式
      const icon = this.dialog.querySelector('.confirmation-icon svg');
      const confirmBtn = this.dialog.querySelector('.confirmation-confirm');
      
      // 重置样式
      confirmBtn.className = 'btn confirmation-confirm';
      icon.className = '';
      
      switch (type) {
        case 'danger':
          confirmBtn.classList.add('btn-danger');
          icon.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke="#ef4444"></circle>
            <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444"></line>
            <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444"></line>
          `;
          break;
        case 'info':
          confirmBtn.classList.add('btn-primary');
          icon.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke="#3b82f6"></circle>
            <line x1="12" y1="16" x2="12" y2="12" stroke="#3b82f6"></line>
            <line x1="12" y1="8" x2="12.01" y2="8" stroke="#3b82f6"></line>
          `;
          break;
        default: // warning
          confirmBtn.classList.add('btn-warning');
          icon.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke="#f59e0b"></circle>
            <line x1="12" y1="8" x2="12" y2="12" stroke="#f59e0b"></line>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="#f59e0b"></line>
          `;
      }
      
      // 显示弹窗
      this.overlay.style.display = 'flex';
      
      // 添加动画
      setTimeout(() => {
        this.overlay.classList.add('show');
      }, 10);
      
      // 聚焦到确认按钮
      setTimeout(() => {
        this.dialog.querySelector('.confirmation-confirm').focus();
      }, 100);
    });
  }

  close(result) {
    this.overlay.classList.remove('show');
    
    setTimeout(() => {
      this.overlay.style.display = 'none';
      if (this.resolveCallback) {
        this.resolveCallback(result);
        this.resolveCallback = null;
      }
    }, 200);
  }
}

// 全局确认弹窗实例
let confirmationDialog = null;

// 便捷方法
window.showConfirmation = function(options) {
  if (!confirmationDialog) {
    confirmationDialog = new ConfirmationDialog();
  }
  return confirmationDialog.show(options);
};

// 替换原有的confirmDelete函数
window.confirmDelete = async function(event, itemName = '此项目') {
  event.preventDefault();
  
  const confirmed = await showConfirmation({
    title: '确认删除',
    message: `您确定要删除 ${itemName} 吗？此操作不可撤销。`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  
  if (confirmed) {
    // 提交表单
    event.target.closest('form').submit();
  }
  
  return false;
};

// 批量操作确认
window.confirmBatchOperation = async function(operation, count) {
  return await showConfirmation({
    title: `确认${operation}`,
    message: `您确定要${operation} ${count} 个项目吗？`,
    confirmText: '确认',
    cancelText: '取消',
    type: 'warning'
  });
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  if (!confirmationDialog) {
    confirmationDialog = new ConfirmationDialog();
  }
});