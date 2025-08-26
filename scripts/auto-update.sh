#!/bin/bash

# =============================================================================
# 自动化更新脚本 - Navigation System Auto Updater
# 功能：从GitHub仓库拉取最新版本并自动更新系统
# 作者：Navigation System
# 版本：1.0.0
# =============================================================================

set -euo pipefail  # 严格模式：遇到错误立即退出

# =============================================================================
# 全局变量配置
# =============================================================================

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
BACKUP_DIR="$PROJECT_ROOT/backups"
TEMP_DIR="/tmp/navigation-update-$$"

# GitHub 仓库配置
GITHUB_REPO="${GITHUB_REPO:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
BRANCH="${BRANCH:-main}"

# 版本文件
VERSION_FILE="$PROJECT_ROOT/VERSION"
REMOTE_VERSION_URL="https://api.github.com/repos/$GITHUB_REPO/contents/VERSION"

# 日志配置
LOG_FILE="$LOG_DIR/update-$(date +%Y%m%d-%H%M%S).log"
MAX_LOG_FILES=10

# 更新模式
SILENT_MODE=false
FORCE_UPDATE=false
DRY_RUN=false

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# 工具函数
# =============================================================================

# 日志函数
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 写入日志文件
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # 控制台输出（除非是静默模式）
    if [[ "$SILENT_MODE" != "true" ]]; then
        case "$level" in
            "ERROR")
                echo -e "${RED}[ERROR]${NC} $message" >&2
                ;;
            "WARN")
                echo -e "${YELLOW}[WARN]${NC} $message"
                ;;
            "SUCCESS")
                echo -e "${GREEN}[SUCCESS]${NC} $message"
                ;;
            "INFO")
                echo -e "${BLUE}[INFO]${NC} $message"
                ;;
            *)
                echo "[$level] $message"
                ;;
        esac
    fi
}

# 错误处理函数
error_exit() {
    log "ERROR" "$1"
    cleanup
    exit 1
}

# 清理函数
cleanup() {
    log "INFO" "清理临时文件..."
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}

# 信号处理
trap cleanup EXIT
trap 'error_exit "脚本被中断"' INT TERM

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error_exit "命令 '$1' 未找到，请先安装"
    fi
}

# 创建目录
ensure_dir() {
    if [[ ! -d "$1" ]]; then
        mkdir -p "$1"
        log "INFO" "创建目录: $1"
    fi
}

# =============================================================================
# 初始化函数
# =============================================================================

init_environment() {
    log "INFO" "初始化更新环境..."
    
    # 检查必要命令
    check_command "curl"
    check_command "jq"
    check_command "git"
    check_command "tar"
    check_command "sha256sum"
    
    # 创建必要目录
    ensure_dir "$LOG_DIR"
    ensure_dir "$BACKUP_DIR"
    ensure_dir "$TEMP_DIR"
    
    # 检查GitHub仓库配置
    if [[ -z "$GITHUB_REPO" ]]; then
        error_exit "未设置 GITHUB_REPO 环境变量"
    fi
    
    log "SUCCESS" "环境初始化完成"
}

# =============================================================================
# 版本检查函数
# =============================================================================

get_local_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        cat "$VERSION_FILE" | tr -d '\n\r'
    else
        echo "0.0.0"
    fi
}

get_remote_version() {
    log "INFO" "获取远程版本信息..."
    
    local headers=()
    if [[ -n "$GITHUB_TOKEN" ]]; then
        headers=("-H" "Authorization: token $GITHUB_TOKEN")
    fi
    
    local response
    response=$(curl -s "${headers[@]}" "$REMOTE_VERSION_URL" 2>/dev/null) || {
        error_exit "无法获取远程版本信息"
    }
    
    # 检查API响应
    if echo "$response" | jq -e '.message' &>/dev/null; then
        local error_msg=$(echo "$response" | jq -r '.message')
        error_exit "GitHub API 错误: $error_msg"
    fi
    
    # 解码base64内容
    echo "$response" | jq -r '.content' | base64 -d | tr -d '\n\r'
}

compare_versions() {
    local local_ver="$1"
    local remote_ver="$2"
    
    log "INFO" "本地版本: $local_ver"
    log "INFO" "远程版本: $remote_ver"
    
    if [[ "$local_ver" == "$remote_ver" ]]; then
        return 1  # 版本相同
    else
        return 0  # 版本不同
    fi
}

# =============================================================================
# 下载和验证函数
# =============================================================================

download_release() {
    local version="$1"
    log "INFO" "下载版本 $version..."
    
    local headers=()
    if [[ -n "$GITHUB_TOKEN" ]]; then
        headers=("-H" "Authorization: token $GITHUB_TOKEN")
    fi
    
    # 获取最新release信息
    local release_url="https://api.github.com/repos/$GITHUB_REPO/releases/latest"
    local release_info
    release_info=$(curl -s "${headers[@]}" "$release_url") || {
        error_exit "无法获取release信息"
    }
    
    # 获取tarball下载链接
    local download_url
    download_url=$(echo "$release_info" | jq -r '.tarball_url')
    
    if [[ "$download_url" == "null" ]]; then
        # 如果没有release，使用源码下载
        download_url="https://github.com/$GITHUB_REPO/archive/refs/heads/$BRANCH.tar.gz"
    fi
    
    # 下载文件
    local archive_file="$TEMP_DIR/update.tar.gz"
    curl -L "${headers[@]}" -o "$archive_file" "$download_url" || {
        error_exit "下载失败"
    }
    
    log "SUCCESS" "下载完成: $archive_file"
    echo "$archive_file"
}

verify_download() {
    local archive_file="$1"
    log "INFO" "验证下载文件..."
    
    # 检查文件是否存在且不为空
    if [[ ! -f "$archive_file" ]] || [[ ! -s "$archive_file" ]]; then
        error_exit "下载文件不存在或为空"
    fi
    
    # 检查文件类型
    if ! file "$archive_file" | grep -q "gzip compressed"; then
        error_exit "下载文件格式错误"
    fi
    
    # 尝试解压测试
    if ! tar -tzf "$archive_file" &>/dev/null; then
        error_exit "下载文件损坏，无法解压"
    fi
    
    log "SUCCESS" "文件验证通过"
}

# =============================================================================
# 备份和回滚函数
# =============================================================================

create_backup() {
    log "INFO" "创建系统备份..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name.tar.gz"
    
    # 排除不需要备份的目录
    local exclude_dirs=("logs" "backups" "node_modules" ".git" "tmp")
    local exclude_args=()
    for dir in "${exclude_dirs[@]}"; do
        exclude_args+=("--exclude=$dir")
    done
    
    # 创建备份
    tar -czf "$backup_path" "${exclude_args[@]}" -C "$(dirname "$PROJECT_ROOT")" "$(basename "$PROJECT_ROOT")" || {
        error_exit "备份创建失败"
    }
    
    log "SUCCESS" "备份创建完成: $backup_path"
    echo "$backup_path"
}

cleanup_old_backups() {
    log "INFO" "清理旧备份文件..."
    
    local backup_count
    backup_count=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" | wc -l)
    
    if [[ $backup_count -gt $MAX_LOG_FILES ]]; then
        find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f -printf '%T@ %p\n' | \
            sort -n | head -n -$MAX_LOG_FILES | cut -d' ' -f2- | \
            xargs rm -f
        log "INFO" "已清理旧备份文件"
    fi
}

rollback() {
    local backup_file="$1"
    log "WARN" "开始回滚到备份: $backup_file"
    
    if [[ ! -f "$backup_file" ]]; then
        error_exit "备份文件不存在: $backup_file"
    fi
    
    # 解压备份到临时目录
    local restore_dir="$TEMP_DIR/restore"
    mkdir -p "$restore_dir"
    
    tar -xzf "$backup_file" -C "$restore_dir" || {
        error_exit "备份文件解压失败"
    }
    
    # 找到解压后的项目目录
    local extracted_dir
    extracted_dir=$(find "$restore_dir" -maxdepth 1 -type d -name "$(basename "$PROJECT_ROOT")" | head -1)
    
    if [[ -z "$extracted_dir" ]]; then
        error_exit "备份文件结构异常"
    fi
    
    # 恢复文件
    rsync -av --delete "$extracted_dir/" "$PROJECT_ROOT/" || {
        error_exit "文件恢复失败"
    }
    
    log "SUCCESS" "回滚完成"
}

# =============================================================================
# 更新函数
# =============================================================================

extract_update() {
    local archive_file="$1"
    log "INFO" "解压更新文件..."
    
    local extract_dir="$TEMP_DIR/extract"
    mkdir -p "$extract_dir"
    
    # 解压文件
    tar -xzf "$archive_file" -C "$extract_dir" || {
        error_exit "解压失败"
    }
    
    # 找到解压后的目录（GitHub的tar包会有一个顶级目录）
    local source_dir
    source_dir=$(find "$extract_dir" -maxdepth 1 -type d | grep -v "^$extract_dir$" | head -1)
    
    if [[ -z "$source_dir" ]]; then
        error_exit "解压目录结构异常"
    fi
    
    log "SUCCESS" "解压完成: $source_dir"
    echo "$source_dir"
}

apply_update() {
    local source_dir="$1"
    local backup_file="$2"
    
    log "INFO" "应用更新..."
    
    # 检查更新前脚本
    local pre_update_script="$source_dir/scripts/pre-update.sh"
    if [[ -f "$pre_update_script" ]]; then
        log "INFO" "执行更新前脚本..."
        bash "$pre_update_script" || {
            log "ERROR" "更新前脚本执行失败，开始回滚"
            rollback "$backup_file"
            error_exit "更新失败"
        }
    fi
    
    # 复制文件（排除某些目录）
    local exclude_dirs=("logs" "backups" "node_modules" ".git" "tmp")
    local rsync_excludes=()
    for dir in "${exclude_dirs[@]}"; do
        rsync_excludes+=("--exclude=$dir")
    done
    
    # 使用rsync同步文件
    rsync -av "${rsync_excludes[@]}" "$source_dir/" "$PROJECT_ROOT/" || {
        log "ERROR" "文件同步失败，开始回滚"
        rollback "$backup_file"
        error_exit "更新失败"
    }
    
    # 检查更新后脚本
    local post_update_script="$PROJECT_ROOT/scripts/post-update.sh"
    if [[ -f "$post_update_script" ]]; then
        log "INFO" "执行更新后脚本..."
        bash "$post_update_script" || {
            log "ERROR" "更新后脚本执行失败，开始回滚"
            rollback "$backup_file"
            error_exit "更新失败"
        }
    fi
    
    log "SUCCESS" "更新应用完成"
}

# =============================================================================
# 交互式函数
# =============================================================================

confirm_update() {
    local local_ver="$1"
    local remote_ver="$2"
    
    if [[ "$SILENT_MODE" == "true" ]] || [[ "$FORCE_UPDATE" == "true" ]]; then
        return 0
    fi
    
    echo
    echo "=== 更新确认 ==="
    echo "当前版本: $local_ver"
    echo "最新版本: $remote_ver"
    echo
    
    read -p "是否继续更新？ [y/N]: " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        log "INFO" "用户取消更新"
        return 1
    fi
}

# =============================================================================
# 主要更新流程
# =============================================================================

perform_update() {
    log "INFO" "开始更新流程..."
    
    # 1. 版本检查
    local local_version
    local remote_version
    
    local_version=$(get_local_version)
    remote_version=$(get_remote_version)
    
    if ! compare_versions "$local_version" "$remote_version"; then
        log "INFO" "系统已是最新版本 ($local_version)"
        return 0
    fi
    
    # 2. 确认更新
    if ! confirm_update "$local_version" "$remote_version"; then
        return 0
    fi
    
    # 3. 创建备份
    local backup_file
    backup_file=$(create_backup)
    
    # 4. 下载更新
    local archive_file
    archive_file=$(download_release "$remote_version")
    
    # 5. 验证下载
    verify_download "$archive_file"
    
    # 6. 解压更新
    local source_dir
    source_dir=$(extract_update "$archive_file")
    
    # 7. 应用更新
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY RUN] 模拟更新完成，实际未执行"
    else
        apply_update "$source_dir" "$backup_file"
        
        # 8. 更新版本文件
        echo "$remote_version" > "$VERSION_FILE"
        
        log "SUCCESS" "更新完成！版本: $local_version -> $remote_version"
    fi
    
    # 9. 清理旧备份
    cleanup_old_backups
}

# =============================================================================
# 命令行参数处理
# =============================================================================

show_help() {
    cat << EOF
自动化更新脚本 - Navigation System Auto Updater

用法: $0 [选项]

选项:
  -s, --silent          静默模式，不显示交互提示
  -f, --force           强制更新，跳过确认
  -d, --dry-run         试运行模式，不实际执行更新
  -r, --repo REPO       指定GitHub仓库 (格式: owner/repo)
  -b, --branch BRANCH   指定分支 (默认: main)
  -t, --token TOKEN     GitHub访问令牌
  -h, --help            显示此帮助信息
  -v, --version         显示脚本版本

环境变量:
  GITHUB_REPO          GitHub仓库 (格式: owner/repo)
  GITHUB_TOKEN         GitHub访问令牌
  BRANCH               分支名称 (默认: main)

示例:
  $0                                    # 交互式更新
  $0 --silent --force                  # 静默强制更新
  $0 --repo owner/repo --token TOKEN   # 指定仓库和令牌
  $0 --dry-run                          # 试运行模式

EOF
}

show_version() {
    echo "Navigation System Auto Updater v1.0.0"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--silent)
                SILENT_MODE=true
                shift
                ;;
            -f|--force)
                FORCE_UPDATE=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -r|--repo)
                GITHUB_REPO="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -t|--token)
                GITHUB_TOKEN="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--version)
                show_version
                exit 0
                ;;
            *)
                echo "未知选项: $1" >&2
                show_help
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# 主函数
# =============================================================================

main() {
    # 解析命令行参数
    parse_args "$@"
    
    # 初始化环境
    init_environment
    
    # 开始更新
    log "INFO" "=== Navigation System 自动更新开始 ==="
    log "INFO" "模式: $([ "$SILENT_MODE" == "true" ] && echo "静默" || echo "交互式")"
    log "INFO" "仓库: $GITHUB_REPO"
    log "INFO" "分支: $BRANCH"
    
    # 执行更新
    perform_update
    
    log "INFO" "=== 自动更新完成 ==="
}

# 脚本入口点
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi