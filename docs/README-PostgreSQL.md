# PostgreSQL 数据库配置指南

## 1. 安装 PostgreSQL

### Windows
- 下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)
- 记住安装时设置的 `postgres` 用户密码

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## 2. 创建数据库和用户

### 方法一：使用 psql 命令行
```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE your_database_name;

# 创建专用用户（推荐）
CREATE USER your_username WITH PASSWORD 'your_secure_password';

# 授权
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;

# 退出
\q
```

### 方法二：使用 createdb 命令
```bash
createdb -U postgres your_database_name
```

## 3. 初始化数据表

```bash
# 执行初始化脚本
psql -U your_username -d your_database_name -f init-db.sql

# 或使用 postgres 用户
psql -U postgres -d your_database_name -f init-db.sql
```

## 4. 配置应用连接

在项目根目录创建 `.env` 文件：

### 方法一：使用连接字符串（推荐）
```env
# 完整连接字符串
DATABASE_URL=postgres://your_username:your_secure_password@localhost:5432/your_database_name

# 会话密钥（必须设置）
SESSION_SECRET=your_random_32_char_secret_key_here

# 可选配置
PORT=3000
CHECK_INTERVAL_MS=300000
STATUS_TIMEOUT_MS=8000
```

### 方法二：分别配置各项
```env
PGHOST=localhost
PGPORT=5432
PGUSER=your_username
PGPASSWORD=your_secure_password
PGDATAbase=your_database_name

SESSION_SECRET=your_random_32_char_secret_key_here
```

## 5. 生产环境安全建议

### 数据库安全
- 使用强密码
- 限制数据库用户权限
- 配置防火墙规则
- 定期备份数据

### 应用安全
- 设置强随机的 `SESSION_SECRET`
- 使用 HTTPS（生产环境）
- 定期更新依赖包

## 6. 常用管理命令

```bash
# 连接数据库
psql -U your_username -d your_database_name

# 查看所有表
\dt

# 查看用户表数据
SELECT * FROM users;

# 查看导航项
SELECT * FROM nav_items ORDER BY order_index;

# 备份数据库
pg_dump -U your_username your_database_name > backup.sql

# 恢复数据库
psql -U your_username -d your_database_name < backup.sql
```

## 7. 故障排除

### 连接失败
- 检查 PostgreSQL 服务是否运行
- 验证用户名、密码、数据库名
- 确认端口号（默认 5432）
- 检查防火墙设置

### 权限错误
```sql
-- 重新授权
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

### 查看日志
```bash
# Ubuntu/Debian
sudo tail -f /var/log/postgresql/postgresql-*.log

# CentOS/RHEL
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

## 8. 启动应用

配置完成后，重启应用：

```bash
npm start
```

应用会自动检测 PostgreSQL 连接，成功连接后会显示：
```
Server running at http://localhost:3000/
```

如果连接失败，会自动回退到内存数据库并显示警告信息。