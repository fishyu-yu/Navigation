# Navigation System

一个现代化的导航网站系统，具有简洁的卡片式布局、主题切换、用户认证和网站状态监控功能。

## ✨ 功能特性

- 🎨 **现代化界面**: 基于卡片式布局的响应式设计
- 🌓 **主题切换**: 支持亮色/暗色主题自动切换
- 🔐 **用户认证**: 安全的管理员登录系统
- 📊 **状态监控**: 实时检测网站可用性状态
- 🛡️ **安全防护**: 集成验证码和访问频率限制
- 📱 **响应式设计**: 完美适配桌面端和移动端
- ⚡ **高性能**: 基于 Node.js + Express 构建

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- PostgreSQL >= 12.0 (可选，支持内存数据库)
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/fishyu-yu/Navigation.git
   cd Navigation
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **系统初始化** (推荐)
   
   使用交互式初始化向导:
   ```bash
   npm run init
   ```
   
   或使用静默模式 (适用于自动化部署):
   ```bash
   # 设置环境变量
   export DB_USER="your_db_user"
   export DB_PASS="your_db_password"
   export ADMIN_PASS="your_admin_password"
   
   # 运行静默初始化
   npm run init-silent
   ```
   
   **快速开发模式（静默模式）：**
   ```bash
   # 静默模式仅支持内存数据库
   ADMIN_USER=admin ADMIN_PASS=Admin123 npm run init-silent
   ```
   
   > ⚠️ **注意**：静默模式仅支持内存数据库，PostgreSQL 需要使用交互式模式进行配置。
   
   初始化向导将帮助您完成:
   - **数据库类型选择**：PostgreSQL（生产环境）或内存数据库（开发测试）
   - 数据库连接配置
   - 管理员账户设置
   - 安全配置 (验证码、会话密钥)
   - 系统基础配置 (端口、域名、时区)

4. **手动配置** (可选)
   
   如果不使用初始化向导，可以手动配置:
   ```bash
   npm run setup
   ```
   这将创建 `.env` 文件并生成安全密钥。
   
   数据库设置:
   ```bash
   # 创建数据库
   createdb -U postgres navigation
   
   # 初始化数据库结构
   npm run init-db
   ```

5. **启动应用**
   ```bash
   npm start
   ```
   
   开发模式:
   ```bash
   npm run dev
   ```

6. **访问应用**
   
   打开浏览器访问 `http://localhost:3000`

## 📁 项目结构

```
navigation/
├── docs/                    # 文档目录
│   └── README-PostgreSQL.md # PostgreSQL 配置指南
├── public/                  # 静态资源
│   ├── admin.js            # 管理后台脚本
│   ├── app.js              # 主应用脚本
│   ├── captcha.js          # 验证码组件
│   ├── confirmation.js     # 确认对话框
│   └── styles.css          # 样式文件
├── scripts/                 # 脚本目录
│   ├── add-sample-data.js  # 添加示例数据
│   ├── init-db.sql         # 数据库初始化脚本
│   ├── seed-database.js    # 数据库种子数据
│   └── setup.js            # 项目设置脚本
├── src/                     # 源代码
│   └── db.js               # 数据库操作
├── views/                   # 模板文件
│   ├── partials/           # 模板片段
│   ├── admin.ejs           # 管理页面
│   ├── edit.ejs            # 编辑页面
│   ├── index.ejs           # 主页
│   └── login.ejs           # 登录页面
├── .env.example            # 环境变量示例
├── package.json            # 项目配置
└── server.js               # 服务器入口
```

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置以下变量：

```env
# 服务器配置
PORT=3000
SESSION_SECRET=your_random_session_secret_here

# 数据库配置 (可选)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
# 或者分别配置
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_database_password
PGDATABASE=your_database_name

# 验证码配置 (可选)
CAPTCHA_ENABLED=false
CAPTCHA_PROVIDER=recaptcha
RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# 状态检测间隔 (毫秒)
CHECK_INTERVAL_MS=300000
```

## 📝 使用指南

### 管理导航项目

1. 访问 `/login` 登录管理后台
2. 首次运行时，系统会自动创建管理员账号
3. 在管理页面可以添加、编辑、删除和排序导航项目
4. 支持批量状态检测功能

### 主题切换

点击页面右上角的主题切换按钮，可以在亮色和暗色主题之间切换。

### 状态监控

系统会定期检测所有导航项目的可用性状态：
- 🟢 绿色：网站正常访问
- 🔴 红色：网站无法访问
- ⚪ 灰色：状态未知

## 🛠️ 开发

### 可用脚本

- `npm start` - 启动生产服务器
- `npm run dev` - 启动开发服务器 (支持热重载)
- `npm run setup` - 初始化项目配置
- `npm run init-db` - 初始化数据库结构
- `npm run sample-data` - 添加示例数据
- `npm run seed` - 使用种子数据脚本
- `npm run clear-data` - 清理所有数据（谨慎使用）
- `npm run clear-db-sql` - 使用SQL脚本清理

### 技术栈

- **后端**: Node.js, Express.js
- **数据库**: PostgreSQL (可选内存数据库)
- **模板引擎**: EJS
- **认证**: bcrypt, express-session
- **安全**: express-rate-limit, 验证码支持
- **前端**: 原生 JavaScript, CSS Grid/Flexbox

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如果您在使用过程中遇到问题，请查看 [docs/README-PostgreSQL.md](docs/README-PostgreSQL.md) 或提交 Issue。
