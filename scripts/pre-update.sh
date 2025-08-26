#!/bin/bash

# =============================================================================
# 更新前钩子脚本 - Pre-Update Hook
# 功能：在系统更新前执行必要的准备工作
# =============================================================================

set -euo pipefail

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [PRE-UPDATE] $*"
}

log "INFO" "开始执行更新前检查..."

# =============================================================================
# 检查系统状态
# =============================================================================

# 检查是否有正在运行的服务
check_running_services() {
    log "INFO" "检查正在运行的服务..."
    
    # 检查Node.js进程
    if pgrep -f "node.*server.js" > /dev/null; then
        log "WARN" "检测到正在运行的Node.js服务"
        
        # 尝试优雅停止
        log "INFO" "尝试停止Node.js服务..."
        pkill -TERM -f "node.*server.js" || true
        
        # 等待进程结束
        sleep 5
        
        # 如果还在运行，强制停止
        if pgrep -f "node.*server.js" > /dev/null; then
            log "WARN" "强制停止Node.js服务"
            pkill -KILL -f "node.*server.js" || true
        fi
        
        log "SUCCESS" "Node.js服务已停止"
    fi
}

# 检查磁盘空间
check_disk_space() {
    log "INFO" "检查磁盘空间..."
    
    local available_space
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log "ERROR" "磁盘空间不足，需要至少1GB可用空间"
        exit 1
    fi
    
    log "SUCCESS" "磁盘空间检查通过"
}

# 检查权限
check_permissions() {
    log "INFO" "检查文件权限..."
    
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        log "ERROR" "没有项目目录的写权限: $PROJECT_ROOT"
        exit 1
    fi
    
    log "SUCCESS" "权限检查通过"
}

# 检查依赖
check_dependencies() {
    log "INFO" "检查系统依赖..."
    
    local required_commands=("node" "npm" "git")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "缺少必要命令: $cmd"
            exit 1
        fi
    done
    
    log "SUCCESS" "依赖检查通过"
}

# =============================================================================
# 数据备份
# =============================================================================

backup_database() {
    log "INFO" "备份数据库..."
    
    # 检查是否有数据库配置
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        
        if [[ -n "${DATABASE_URL:-}" ]]; then
            local backup_dir="$PROJECT_ROOT/backups/db"
            mkdir -p "$backup_dir"
            
            local backup_file="$backup_dir/db-backup-$(date +%Y%m%d-%H%M%S).sql"
            
            # 根据数据库类型执行备份
            if [[ "${DB_TYPE:-}" == "postgresql" ]]; then
                log "INFO" "备份PostgreSQL数据库..."
                pg_dump "$DATABASE_URL" > "$backup_file" 2>/dev/null || {
                    log "WARN" "数据库备份失败，但继续更新"
                    return 0
                }
                log "SUCCESS" "数据库备份完成: $backup_file"
            fi
        fi
    fi
}

# 备份配置文件
backup_config() {
    log "INFO" "备份配置文件..."
    
    local config_backup_dir="$PROJECT_ROOT/backups/config"
    mkdir -p "$config_backup_dir"
    
    local config_files=(".env" "package.json" "package-lock.json")
    
    for file in "${config_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            cp "$PROJECT_ROOT/$file" "$config_backup_dir/$file.$(date +%Y%m%d-%H%M%S)" || {
                log "WARN" "无法备份配置文件: $file"
            }
        fi
    done
    
    log "SUCCESS" "配置文件备份完成"
}

# =============================================================================
# 主执行流程
# =============================================================================

main() {
    log "INFO" "=== 更新前检查开始 ==="
    
    # 系统检查
    check_running_services
    check_disk_space
    check_permissions
    check_dependencies
    
    # 数据备份
    backup_database
    backup_config
    
    log "INFO" "=== 更新前检查完成 ==="
    log "SUCCESS" "系统已准备好进行更新"
}

# 执行主函数
main "$@"