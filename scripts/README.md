# 自动化更新脚本 (Auto-Update Script)

这是一个功能完整的自动化更新脚本，用于从GitHub仓库安全地拉取和部署最新版本的更新。

## 功能特性

### 🔍 版本检查
- 自动检查本地版本与GitHub远程仓库的差异
- 支持语义化版本比较
- 可配置的版本检查策略

### 🔒 安全下载
- 安全的文件下载和验证机制
- 支持校验和验证
- 可选的数字签名验证
- 网络超时和重试机制

### 🔄 回滚机制
- 自动备份当前版本
- 更新失败时自动回滚
- 手动回滚支持
- 备份文件管理

### 🎛️ 双模式支持
- **静默模式**: 无用户交互的自动更新
- **交互式模式**: 用户确认的手动更新
- 灵活的配置选项

### 📝 详细日志
- 完整的更新过程记录
- 可配置的日志级别
- 日志轮转和清理
- 结构化日志输出

### 🛠️ 错误处理
- 完善的错误检测和处理
- 优雅的失败恢复
- 详细的错误报告

### 🐧 Linux兼容
- 完全兼容Linux系统
- 跨平台脚本设计
- 系统依赖自动检测

## 文件结构

```
scripts/
├── auto-update.sh          # 主更新脚本
├── pre-update.sh           # 更新前钩子脚本
├── post-update.sh          # 更新后钩子脚本
├── update-config.conf      # 配置文件
└── README.md              # 使用说明
```

## 快速开始

### 1. 配置脚本

编辑 `update-config.conf` 文件，设置必要的配置项：

```bash
# 基本配置
GITHUB_OWNER="your-username"        # GitHub用户名或组织名
GITHUB_REPO="your-repository"       # 仓库名称
PROJECT_ROOT="/path/to/your/project" # 项目根目录
```

### 2. 设置执行权限

```bash
chmod +x scripts/*.sh
```

### 3. 运行更新

```bash
# 交互式更新
./scripts/auto-update.sh

# 静默更新
./scripts/auto-update.sh --silent

# 检查更新但不执行
./scripts/auto-update.sh --check-only
```

## 使用方法

### 命令行选项

```bash
./auto-update.sh [选项]

选项:
  -s, --silent              静默模式，无用户交互
  -c, --check-only          仅检查更新，不执行
  -f, --force               强制更新，忽略本地修改
  -b, --backup-only         仅创建备份
  -r, --rollback [VERSION]  回滚到指定版本
  -l, --list-backups        列出可用的备份
  -v, --verbose             详细输出
  -d, --dry-run             干运行模式，仅模拟
  -h, --help                显示帮助信息
  --version                 显示脚本版本
  --config FILE             指定配置文件
  --log-level LEVEL         设置日志级别
```

### 使用示例

```bash
# 检查是否有可用更新
./auto-update.sh --check-only

# 静默更新到最新版本
./auto-update.sh --silent

# 强制更新（忽略本地修改）
./auto-update.sh --force

# 回滚到上一个版本
./auto-update.sh --rollback

# 回滚到指定版本
./auto-update.sh --rollback v1.2.3

# 列出所有可用备份
./auto-update.sh --list-backups

# 使用自定义配置文件
./auto-update.sh --config /path/to/custom.conf

# 详细模式运行
./auto-update.sh --verbose

# 干运行模式（仅模拟，不实际执行）
./auto-update.sh --dry-run
```

## 配置说明

### 基本配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `GITHUB_OWNER` | GitHub用户名或组织名 | - |
| `GITHUB_REPO` | 仓库名称 | - |
| `GITHUB_BRANCH` | 分支名称 | main |
| `PROJECT_ROOT` | 项目根目录 | - |

### 更新行为配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `AUTO_BACKUP` | 是否自动备份 | true |
| `AUTO_RESTART` | 是否自动重启服务 | true |
| `FORCE_UPDATE` | 是否强制更新 | false |
| `SKIP_DEPENDENCY_CHECK` | 是否跳过依赖检查 | false |

### 安全配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `VERIFY_CHECKSUMS` | 是否验证校验和 | true |
| `VERIFY_SIGNATURES` | 是否验证数字签名 | false |
| `ALLOW_DOWNGRADE` | 是否允许版本降级 | false |

### 网络配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `CONNECTION_TIMEOUT` | 连接超时时间（秒） | 30 |
| `DOWNLOAD_TIMEOUT` | 下载超时时间（秒） | 300 |
| `RETRY_COUNT` | 重试次数 | 3 |
| `RETRY_DELAY` | 重试间隔（秒） | 5 |

## 钩子脚本

### 更新前钩子 (pre-update.sh)

在更新开始前执行，用于：
- 停止正在运行的服务
- 检查系统状态
- 备份数据库和配置文件
- 验证系统依赖

### 更新后钩子 (post-update.sh)

在更新完成后执行，用于：
- 安装/更新依赖
- 执行数据库迁移
- 启动服务
- 执行健康检查
- 发送通知

### 自定义钩子

你可以通过修改钩子脚本来添加自定义的更新逻辑：

```bash
# 在pre-update.sh中添加自定义检查
custom_pre_check() {
    log "INFO" "执行自定义检查..."
    # 你的自定义逻辑
}

# 在post-update.sh中添加自定义处理
custom_post_process() {
    log "INFO" "执行自定义处理..."
    # 你的自定义逻辑
}
```

## 日志管理

### 日志文件位置

- 主日志: `logs/auto-update.log`
- 错误日志: `logs/auto-update-error.log`
- 通知日志: `logs/update-notifications.log`

### 日志级别

- `DEBUG`: 详细的调试信息
- `INFO`: 一般信息
- `WARN`: 警告信息
- `ERROR`: 错误信息

### 日志轮转

脚本会自动管理日志文件：
- 按大小轮转（默认100MB）
- 按时间清理（默认保留7天）
- 压缩旧日志文件

## 备份管理

### 备份类型

1. **完整备份**: 整个项目目录的备份
2. **增量备份**: 仅备份修改的文件
3. **配置备份**: 仅备份配置文件
4. **数据库备份**: 数据库的备份

### 备份策略

- 自动备份: 每次更新前自动创建备份
- 定期清理: 根据配置清理旧备份
- 压缩存储: 自动压缩备份文件以节省空间

### 手动备份

```bash
# 创建完整备份
./auto-update.sh --backup-only

# 列出所有备份
./auto-update.sh --list-backups
```

## 故障排除

### 常见问题

#### 1. 权限错误

```bash
# 确保脚本有执行权限
chmod +x scripts/*.sh

# 确保项目目录有写权限
chown -R $USER:$USER /path/to/project
```

#### 2. 网络连接问题

```bash
# 检查网络连接
curl -I https://api.github.com

# 配置代理（如果需要）
export https_proxy=http://proxy.example.com:8080
```

#### 3. 依赖缺失

```bash
# 安装必要的依赖
sudo apt-get install curl jq git nodejs npm
```

#### 4. 磁盘空间不足

```bash
# 检查磁盘空间
df -h

# 清理旧备份
./auto-update.sh --cleanup
```

### 调试模式

启用调试模式获取详细信息：

```bash
# 在配置文件中设置
DEBUG_MODE=true
VERBOSE_OUTPUT=true
LOG_LEVEL="DEBUG"

# 或使用命令行参数
./auto-update.sh --verbose --log-level DEBUG
```

### 日志分析

```bash
# 查看最新日志
tail -f logs/auto-update.log

# 搜索错误信息
grep "ERROR" logs/auto-update.log

# 查看特定时间的日志
grep "2024-01-15" logs/auto-update.log
```

## 安全考虑

### 1. 访问控制

- 限制脚本的执行权限
- 使用专用用户运行更新脚本
- 定期审查访问日志

### 2. 网络安全

- 使用HTTPS进行所有网络通信
- 验证SSL证书
- 配置防火墙规则

### 3. 文件完整性

- 启用校验和验证
- 使用数字签名（如果可用）
- 定期检查文件完整性

### 4. 备份安全

- 加密敏感备份文件
- 安全存储备份
- 定期测试备份恢复

## 性能优化

### 1. 网络优化

```bash
# 启用并行下载
PARALLEL_DOWNLOADS=true

# 使用增量更新
USE_DELTA_UPDATES=true

# 启用下载缓存
CACHE_DOWNLOADS=true
```

### 2. 存储优化

```bash
# 压缩备份文件
COMPRESS_BACKUPS=true

# 限制备份数量
MAX_BACKUP_COUNT=10

# 自动清理临时文件
CLEANUP_ON_EXIT=true
```

### 3. 系统资源

```bash
# 限制并发操作
MAX_CONCURRENT_OPERATIONS=3

# 设置内存限制
MEMORY_LIMIT="512M"

# 监控磁盘空间
DISK_SPACE_THRESHOLD="1G"
```

## 集成指南

### 1. CI/CD集成

```yaml
# GitHub Actions示例
name: Auto Update
on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Auto Update
        run: ./scripts/auto-update.sh --silent
```

### 2. Cron任务

```bash
# 添加到crontab
# 每天凌晨2点检查更新
0 2 * * * /path/to/project/scripts/auto-update.sh --silent

# 每周日凌晨3点强制更新
0 3 * * 0 /path/to/project/scripts/auto-update.sh --silent --force
```

### 3. 系统服务

```ini
# /etc/systemd/system/auto-update.service
[Unit]
Description=Auto Update Service
After=network.target

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/path/to/project
ExecStart=/path/to/project/scripts/auto-update.sh --silent

[Install]
WantedBy=multi-user.target
```

### 4. 监控集成

```bash
# 集成Prometheus监控
echo "update_last_run $(date +%s)" > /var/lib/node_exporter/textfile_collector/update.prom
echo "update_status 1" >> /var/lib/node_exporter/textfile_collector/update.prom
```

## 贡献指南

欢迎贡献代码和改进建议！

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/your-username/navigation-system.git
cd navigation-system

# 设置开发环境
cp scripts/update-config.conf scripts/update-config.dev.conf
# 编辑开发配置

# 运行测试
./scripts/auto-update.sh --dry-run --config scripts/update-config.dev.conf
```

### 提交规范

- 使用清晰的提交信息
- 遵循现有的代码风格
- 添加适当的测试
- 更新相关文档

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 支持

如果遇到问题或需要帮助：

1. 查看本文档的故障排除部分
2. 检查项目的 Issues 页面
3. 创建新的 Issue 描述问题
4. 联系维护者

---

**注意**: 在生产环境中使用前，请务必在测试环境中充分测试脚本的所有功能。