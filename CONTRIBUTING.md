# 贡献指南

感谢您对 Navigation System 项目的关注！我们欢迎所有形式的贡献。

## 🚀 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议，请：

1. 检查 [Issues](../../issues) 确保问题尚未被报告
2. 创建新的 Issue，包含：
   - 清晰的标题和描述
   - 重现步骤（如果是 bug）
   - 期望的行为
   - 实际的行为
   - 环境信息（操作系统、Node.js 版本等）
   - 相关的错误日志或截图

### 提交代码

1. **Fork 项目**
   ```bash
   git clone https://github.com/your-username/navigation.git
   cd navigation
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或者修复分支
   git checkout -b fix/your-fix-name
   ```

3. **设置开发环境**
   ```bash
   npm install
   npm run setup
   npm run dev
   ```

4. **进行更改**
   - 遵循现有的代码风格
   - 添加必要的测试
   - 更新相关文档

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   # 或者
   git commit -m "fix: 修复问题描述"
   ```

6. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   - 提供清晰的标题和描述
   - 链接相关的 Issues
   - 描述更改的内容和原因

## 📝 代码规范

### JavaScript 代码风格

- 使用 2 个空格缩进
- 使用单引号字符串
- 行末不加分号（除非必要）
- 函数名使用驼峰命名法
- 常量使用大写字母和下划线

```javascript
// ✅ 好的示例
const API_BASE_URL = 'https://api.example.com'

function getUserData(userId) {
  return fetch(`${API_BASE_URL}/users/${userId}`)
    .then(response => response.json())
}

// ❌ 避免的写法
const api_base_url = "https://api.example.com";

function get_user_data(user_id) {
    return fetch(api_base_url + "/users/" + user_id)
        .then(function(response) {
            return response.json();
        });
}
```

### CSS 代码风格

- 使用 2 个空格缩进
- 属性按字母顺序排列
- 使用 kebab-case 命名类名
- 避免使用 ID 选择器

```css
/* ✅ 好的示例 */
.nav-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1rem;
  transition: transform 0.2s ease;
}

.nav-card:hover {
  transform: translateY(-2px);
}

/* ❌ 避免的写法 */
#navCard {
    background-color: #ffffff;
    padding: 16px;
    border-radius: 8px;
    transition: all 0.2s;
}
```

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型 (type):**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例:**
```
feat(auth): 添加双因素认证支持

fix(ui): 修复暗色主题下按钮颜色问题

docs: 更新安装指南

refactor(db): 优化数据库连接池配置
```

## 🧪 测试

在提交 PR 之前，请确保：

1. **功能测试**
   ```bash
   npm start
   # 测试所有主要功能
   ```

2. **代码检查**
   - 检查控制台是否有错误
   - 验证响应式设计
   - 测试不同浏览器兼容性

3. **数据库测试**（如果涉及数据库更改）
   ```bash
   npm run init-db
   # 测试数据库操作
   ```

## 📋 开发流程

### 新功能开发

1. 在 Issues 中讨论功能需求
2. 创建功能分支
3. 实现功能并添加文档
4. 提交 Pull Request
5. 代码审查和讨论
6. 合并到主分支

### Bug 修复

1. 重现并确认 bug
2. 创建修复分支
3. 实现修复
4. 验证修复效果
5. 提交 Pull Request

## 🎯 优先级

我们特别欢迎以下类型的贡献：

- 🐛 Bug 修复
- 📚 文档改进
- 🌐 国际化支持
- ♿ 可访问性改进
- 🔒 安全性增强
- ⚡ 性能优化
- 🧪 测试覆盖率提升

## 💬 交流

- 通过 Issues 讨论功能和问题
- 在 Pull Request 中进行代码审查
- 遵循友善和建设性的交流原则

## 📜 行为准则

- 尊重所有贡献者
- 保持友善和专业的态度
- 接受建设性的反馈
- 专注于对项目最有利的解决方案

感谢您的贡献！🎉