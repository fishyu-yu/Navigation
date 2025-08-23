# 系统初始化指南

本文档详细介绍如何使用 Navigation System 的初始化向导完成系统首次部署配置。

## 🚀 快速开始

### 交互式初始化

推荐使用交互式初始化向导，它将引导您完成所有必要的配置：

```bash
npm run init
```

### 静默模式初始化

适用于自动化部署场景，通过环境变量传递配置参数：

```bash
# 设置必要的环境变量
export DB_USER="postgres"
export DB_PASS="your_password"
export ADMIN_PASS="SecurePassword123"

# 可选的环境变量
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="navigation"
export ADMIN_USER="admin"
export SYSTEM_PORT="3000"
export SYSTEM_DOMAIN="http://localhost:3000"

# 运行静默初始化
npm run init-silent
```

## 📋 配置流程

### 1. 数据库配置

初始化向导将引导您配置 PostgreSQL 数据库连接：

- **数据库主机**: 默认 `localhost`
- **数据库端口**: 默认 `5432`
- **数据库用户名**: 必填
- **数据库密码**: 必填
- **数据库名称**: 默认 `navigation`

向导会自动测试数据库连接并初始化表结构。

### 2. 管理员账户设置

配置系统管理员账户：

- **用户名**: 默认 `admin`
- **密码**: 必须满足强度要求
  - 至少 8 位字符
  - 包含大写字母
  - 包含小写字母
  - 包含数字

### 3. 安全配置

系统安全相关配置：

- **会话密钥**: 自动生成 32 字节随机密钥
- **验证码配置**: 可选启用
  - Google reCAPTCHA
  - Cloudflare Turnstile

### 4. 系统基础配置

系统运行相关配置：

- **系统端口**: 默认 `3000`
- **系统域名**: 默认 `http://localhost:3000`
- **时区设置**: 支持多个时区选择
- **语言设置**: 中文/英文

## 🔧 高级配置

### 验证码配置

如果启用验证码功能，需要配置相应的密钥：

#### Google reCAPTCHA

1. 访问 [Google reCAPTCHA](https://www.google.com/recaptcha/)
2. 创建新站点
3. 获取 Site Key 和 Secret Key
4. 在初始化向导中输入密钥

#### Cloudflare Turnstile

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Turnstile 页面
3. 创建新站点
4. 获取 Site Key 和 Secret Key
5. 在初始化向导中输入密钥

### 数据库配置

#### PostgreSQL 设置

确保 PostgreSQL 服务正在运行，并且具有创建数据库的权限：

```bash
# 创建数据库用户（如果需要）
sudo -u postgres createuser --interactive

# 创建数据库
sudo -u postgres createdb navigation

# 授予权限
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE navigation TO your_user;"
```

#### 内存数据库模式

如果不配置 PostgreSQL，系统将自动使用内存数据库模式。注意：

- 数据在应用重启后会丢失
- 适用于开发和测试环境
- 不推荐在生产环境使用

## 📝 配置文件

初始化完成后，系统会生成 `.env` 配置文件：

```env
# Navigation System 配置文件
# 由初始化向导自动生成

# 应用端口
PORT=3000

# 会话加密密钥
SESSION_SECRET=generated_secret_key

# PostgreSQL 数据库连接
DATABASE_URL=postgresql://user:pass@host:port/dbname

# 验证码配置
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=recaptcha
RECAPTCHA_SITE_KEY=your_site_key
RECAPTCHA_SECRET_KEY=your_secret_key

# 系统配置
SYSTEM_DOMAIN=http://localhost:3000
SYSTEM_TIMEZONE=Asia/Shanghai
SYSTEM_LANGUAGE=zh-CN
```

## 🚨 故障排除

### 数据库连接失败

1. 检查 PostgreSQL 服务是否运行
2. 验证数据库用户名和密码
3. 确认数据库已创建
4. 检查防火墙设置

### 管理员账户创建失败

1. 确保数据库连接正常
2. 检查数据库表是否正确创建
3. 验证管理员密码强度

### 验证码配置问题

1. 确认密钥正确性
2. 检查域名配置是否匹配
3. 验证网络连接

## 📚 相关文档

- [PostgreSQL 配置指南](README-PostgreSQL.md)
- [项目主文档](../README.md)
- [API 文档](API.md)

## 🆘 获取帮助

如果在初始化过程中遇到问题：

1. 查看控制台错误信息
2. 检查系统日志
3. 参考故障排除部分
4. 提交 Issue 到项目仓库

---

**注意**: 初始化向导会覆盖现有的 `.env` 配置文件，请在运行前备份重要配置。