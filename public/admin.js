// 拖拽排序功能
class DragSort {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.draggedElement = null;
    this.placeholder = null;
    this.init();
  }

  init() {
    if (!this.container) return;
    
    this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
    this.container.addEventListener('dragend', this.handleDragEnd.bind(this));
    
    // 为每个导航项添加拖拽属性
    this.updateDragAttributes();
  }

  updateDragAttributes() {
    const items = this.container.querySelectorAll('.nav-item');
    items.forEach((item, index) => {
      item.draggable = true;
      item.dataset.index = index;
      
      // 添加拖拽手柄
      if (!item.querySelector('.drag-handle')) {
        const handle = document.createElement('div');
        handle.className = 'drag-handle';
        handle.innerHTML = '⋮⋮';
        handle.title = '拖拽排序';
        item.insertBefore(handle, item.firstChild);
      }
    });
  }

  handleDragStart(e) {
    if (!e.target.closest('.nav-item')) return;
    
    this.draggedElement = e.target.closest('.nav-item');
    this.draggedElement.classList.add('dragging');
    
    // 创建占位符
    this.placeholder = document.createElement('div');
    this.placeholder.className = 'drag-placeholder';
    this.placeholder.innerHTML = '放置在此处';
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.draggedElement.outerHTML);
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    if (afterElement == null) {
      this.container.appendChild(this.placeholder);
    } else {
      this.container.insertBefore(this.placeholder, afterElement);
    }
  }

  handleDrop(e) {
    e.preventDefault();
    
    if (this.draggedElement && this.placeholder.parentNode) {
      this.placeholder.parentNode.insertBefore(this.draggedElement, this.placeholder);
      this.saveNewOrder();
    }
  }

  handleDragEnd(e) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }
    
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.parentNode.removeChild(this.placeholder);
    }
    
    this.updateDragAttributes();
  }

  getDragAfterElement(y) {
    const draggableElements = [...this.container.querySelectorAll('.nav-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  async saveNewOrder() {
    const items = [...this.container.querySelectorAll('.nav-item')].map((item, index) => {
      const id = item.querySelector('form[action*="delete"]').action.match(/\/(\d+)\/delete/)[1];
      return { id: parseInt(id), order_index: index };
    });

    try {
      const response = await fetch('/admin/nav/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error('排序保存失败');
      }

      // 显示成功提示
      this.showMessage('排序已保存', 'success');
    } catch (error) {
      console.error('保存排序失败:', error);
      this.showMessage('排序保存失败，请重试', 'error');
      // 刷新页面恢复原始顺序
      setTimeout(() => location.reload(), 2000);
    }
  }

  showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `message message-${type}`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      message.classList.remove('show');
      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化拖拽排序
document.addEventListener('DOMContentLoaded', () => {
  new DragSort('.nav-list');
});

// 确认删除功能已移至confirmation.js
// 这里保留兼容性，但实际使用confirmation.js中的实现