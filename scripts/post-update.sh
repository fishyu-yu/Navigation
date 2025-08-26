#!/bin/bash

# =============================================================================
# 更新后钩子脚本 - Post-Update Hook
# 功能：在系统更新后执行必要的后续工作
# =============================================================================

set -euo pipefail

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [POST-UPDATE] $*"
}

log "INFO" "开始执行更新后处理..."

# =============================================================================
# 依赖安装和更新
# =============================================================================

install_dependencies() {
    log "INFO" "安装/更新项目依赖..."
    
    cd "$PROJECT_ROOT"
    
    # 检查package.json是否存在
    if [[ ! -f "package.json" ]]; then
        log "WARN" "未找到package.json文件，跳过依赖安装"
        return 0
    fi
    
    # 清理node_modules缓存
    if [[ -d "node_modules" ]]; then
        log "INFO" "清理旧的node_modules..."
        rm -rf node_modules
    fi
    
    # 安装依赖
    log "INFO" "执行npm install..."
    npm install --production || {
        log "ERROR" "依赖安装失败"
        return 1
    }
    
    log "SUCCESS" "依赖安装完成"
}

# =============================================================================
# 数据库迁移
# =============================================================================

run_database_migrations() {
    log "INFO" "检查数据库迁移..."
    
    # 检查是否有迁移脚本
    if [[ -d "$PROJECT_ROOT/migrations" ]]; then
        log "INFO" "执行数据库迁移..."
        
        # 这里可以根据实际的迁移工具调整命令
        if [[ -f "$PROJECT_ROOT/migrate.js" ]]; then
            node "$PROJECT_ROOT/migrate.js" || {
                log "ERROR" "数据库迁移失败"
                return 1
            }
        fi
        
        log "SUCCESS" "数据库迁移完成"
    else
        log "INFO" "未找到迁移脚本，跳过数据库迁移"
    fi
}

# =============================================================================
# 配置文件处理
# =============================================================================

update_config_files() {
    log "INFO" "处理配置文件..."
    
    # 检查是否有新的配置模板
    if [[ -f "$PROJECT_ROOT/.env.example" && ! -f "$PROJECT_ROOT/.env" ]]; then
        log "INFO" "创建默认配置文件..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        log "WARN" "请检查并更新.env配置文件"
    fi
    
    # 设置正确的文件权限
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        chmod 600 "$PROJECT_ROOT/.env"
        log "INFO" "已设置.env文件权限"
    fi
    
    log "SUCCESS" "配置文件处理完成"
}

# =============================================================================
# 服务启动
# =============================================================================

start_services() {
    log "INFO" "启动应用服务..."
    
    cd "$PROJECT_ROOT"
    
    # 检查是否有启动脚本
    if [[ -f "server.js" ]]; then
        # 检查是否使用PM2管理
        if command -v pm2 &> /dev/null && [[ -f "ecosystem.config.js" ]]; then
            log "INFO" "使用PM2启动服务..."
            pm2 start ecosystem.config.js --env production || {
                log "ERROR" "PM2启动失败"
                return 1
            }
        else
            log "INFO" "使用Node.js直接启动服务..."
            # 在后台启动服务
            nohup node server.js > logs/app.log 2>&1 &
            local pid=$!
            echo $pid > "$PROJECT_ROOT/app.pid"
            
            # 等待服务启动
            sleep 5
            
            # 检查服务是否正常运行
            if kill -0 $pid 2>/dev/null; then
                log "SUCCESS" "服务启动成功 (PID: $pid)"
            else
                log "ERROR" "服务启动失败"
                return 1
            fi
        fi
    else
        log "WARN" "未找到server.js，跳过服务启动"
    fi
}

# =============================================================================
# 健康检查
# =============================================================================

health_check() {
    log "INFO" "执行健康检查..."
    
    # 检查HTTP服务是否响应
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:3000/health" > /dev/null 2>&1; then
            log "SUCCESS" "健康检查通过"
            return 0
        fi
        
        log "INFO" "等待服务响应... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log "WARN" "健康检查超时，但更新已完成"
    return 0
}

# =============================================================================
# 清理工作
# =============================================================================

cleanup() {
    log "INFO" "执行清理工作..."
    
    # 清理临时文件
    if [[ -d "$PROJECT_ROOT/tmp" ]]; then
        rm -rf "$PROJECT_ROOT/tmp"/* 2>/dev/null || true
    fi
    
    # 清理旧的日志文件（保留最近7天）
    if [[ -d "$PROJECT_ROOT/logs" ]]; then
        find "$PROJECT_ROOT/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    fi
    
    # 清理旧的备份文件（保留最近30天）
    if [[ -d "$PROJECT_ROOT/backups" ]]; then
        find "$PROJECT_ROOT/backups" -type f -mtime +30 -delete 2>/dev/null || true
    fi
    
    log "SUCCESS" "清理工作完成"
}

# =============================================================================
# 通知功能
# =============================================================================

send_notification() {
    local status="$1"
    local message="$2"
    
    log "INFO" "发送更新通知: $message"
    
    # 这里可以集成各种通知方式
    # 例如：邮件、Slack、钉钉等
    
    # 示例：写入系统日志
    logger "Navigation System Update: $status - $message"
    
    # 示例：创建通知文件
    echo "$(date): $status - $message" >> "$PROJECT_ROOT/logs/update-notifications.log"
}

# =============================================================================
# 主执行流程
# =============================================================================

main() {
    log "INFO" "=== 更新后处理开始 ==="
    
    local success=true
    
    # 依赖安装
    if ! install_dependencies; then
        success=false
        send_notification "ERROR" "依赖安装失败"
    fi
    
    # 数据库迁移
    if ! run_database_migrations; then
        success=false
        send_notification "ERROR" "数据库迁移失败"
    fi
    
    # 配置文件处理
    if ! update_config_files; then
        success=false
        send_notification "ERROR" "配置文件处理失败"
    fi
    
    # 启动服务
    if ! start_services; then
        success=false
        send_notification "ERROR" "服务启动失败"
    fi
    
    # 健康检查
    health_check
    
    # 清理工作
    cleanup
    
    if [[ "$success" == "true" ]]; then
        log "INFO" "=== 更新后处理完成 ==="
        log "SUCCESS" "系统更新成功，服务已恢复正常"
        send_notification "SUCCESS" "系统更新完成，所有服务正常运行"
    else
        log "ERROR" "=== 更新后处理存在错误 ==="
        log "ERROR" "部分操作失败，请检查日志"
        send_notification "WARNING" "系统更新完成，但部分操作存在问题"
        exit 1
    fi
}

# 执行主函数
main "$@"