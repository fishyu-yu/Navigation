# Navigation System 初始化指南

本文档详细说明如何使用初始化向导进行 Navigation System 的部署配置。

## 快速开始

### 交互式模式（推荐）

```bash
# 运行初始化向导
npm run init

# 或者直接运行脚本
node scripts/init-wizard.js
```

### 静默模式

适用于快速开发和测试环境：

```bash
# 静默模式（仅支持内存数据库）
ADMIN_USER=admin ADMIN_PASS=Admin123 npm run init-silent

# 或者直接运行脚本
ADMIN_USER=admin ADMIN_PASS=Admin123 node scripts/init-wizard.js --silent
```

> ⚠️ **重要提示**：静默模式仅支持内存数据库，不支持 PostgreSQL。如需使用 PostgreSQL，请使用交互式模式。

## 配置流程

初始化向导将按以下顺序进行配置：

### 1. 数据库配置

**数据库类型选择：**
- **PostgreSQL 数据库**：适用于生产环境，提供完整的数据持久化
- **内存数据库**：适用于开发和测试，数据存储在内存中，重启后数据丢失

**PostgreSQL 配置项：**
- 数据库主机地址
- 数据库端口（默认：5432）
- 数据库用户名
- 数据库密码
- 数据库名称（默认：navigation）

**内存数据库：**
- 无需配置连接参数
- 自动初始化数据结构
- 适合快速开发和测试

### 2. 管理员账户设置

- 管理员用户名（默认：admin）
- 管理员密码（需符合安全要求）

**密码要求：**
- 至少8个字符
- 包含大写字母
- 包含小写字母
- 包含数字

### 3. 安全配置

- 会话密钥（自动生成）
- 验证码设置（可选）
  - Google reCAPTCHA
  - Cloudflare Turnstile

### 4. 系统基础配置

- 服务端口（默认：3000）
- 系统域名（默认：http://localhost:3000）
- 时区设置（默认：Asia/Shanghai）
- 语言设置（默认：zh-CN）

## 高级配置

### 验证码配置

如果启用验证码功能，需要配置相应的密钥：

**Google reCAPTCHA：**
```bash
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=recaptcha
RECAPTCHA_SITE_KEY=your_site_key
RECAPTCHA_SECRET_KEY=your_secret_key
```

**Cloudflare Turnstile：**
```bash
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=turnstile
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

### 数据库高级配置

**PostgreSQL 连接字符串：**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

**内存数据库：**
```bash
DB_TYPE=memory
# 无需其他数据库配置
```

## 配置文件示例

### PostgreSQL 配置

```env
# Navigation System 配置文件
# 由初始化向导自动生成

# 数据库类型
DB_TYPE=postgresql

# PostgreSQL 数据库连接
DATABASE_URL=postgresql://admin:password@localhost:5432/navigation
PGHOST=localhost
PGPORT=5432
PGUSER=admin
PGPASSWORD=password
PGDATABASE=navigation

# 应用端口
PORT=3000

# 会话加密密钥
SESSION_SECRET=generated_secret_key

# 验证码配置
CAPTCHA_ENABLED=false

# 系统配置
SYSTEM_DOMAIN=http://localhost:3000
SYSTEM_TIMEZONE=Asia/Shanghai
SYSTEM_LANGUAGE=zh-CN
```

### 内存数据库配置

```env
# Navigation System 配置文件
# 由初始化向导自动生成

# 数据库类型
DB_TYPE=memory

# 内存数据库 - 无需连接配置
# DATABASE_URL=memory

# 应用端口
PORT=3000

# 会话加密密钥
SESSION_SECRET=generated_secret_key

# 验证码配置
CAPTCHA_ENABLED=false

# 系统配置
SYSTEM_DOMAIN=http://localhost:3000
SYSTEM_TIMEZONE=Asia/Shanghai
SYSTEM_LANGUAGE=zh-CN
```

## 故障排除

### 常见问题

**1. 数据库连接失败**
- 检查数据库服务是否运行
- 验证连接参数是否正确
- 确认数据库用户权限

**2. 密码不符合要求**
- 确保密码至少8个字符
- 包含大写字母、小写字母和数字

**3. 端口被占用**
- 更改系统端口配置
- 检查其他服务是否占用端口

**4. 内存数据库数据丢失**
- 这是正常现象，内存数据库重启后数据会丢失
- 生产环境请使用 PostgreSQL

### 重新初始化

如需重新配置系统：

```bash
# 删除现有配置文件
rm .env

# 重新运行初始化向导
npm run init
```

## 相关文档

- [README.md](./README.md) - 项目概述和基本使用
- [.env.example](./.env.example) - 配置文件模板
- [scripts/init-wizard.js](./scripts/init-wizard.js) - 初始化脚本源码

## 获取帮助

如果在初始化过程中遇到问题：

1. 查看控制台错误信息
2. 检查配置文件格式
3. 参考本文档的故障排除部分
4. 查看项目 Issues 或提交新的 Issue

---

**注意：** 内存数据库仅适用于开发和测试环境，生产环境请务必使用 PostgreSQL 数据库以确保数据安全和持久化。