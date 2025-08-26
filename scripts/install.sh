#!/bin/bash

# =============================================================================
# 自动化更新脚本安装程序
# Auto-Update Script Installer
# =============================================================================

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本信息
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="Auto-Update Installer"

# 默认配置
DEFAULT_USER="www-data"
DEFAULT_GROUP="www-data"
DEFAULT_PROJECT_ROOT="/var/www/navigation"
DEFAULT_SERVICE_NAME="navigation-update"

# 全局变量
INSTALL_USER="$DEFAULT_USER"
INSTALL_GROUP="$DEFAULT_GROUP"
PROJECT_ROOT="$DEFAULT_PROJECT_ROOT"
SERVICE_NAME="$DEFAULT_SERVICE_NAME"
INSTALL_SYSTEMD=true
INSTALL_CRON=false
SILENT_MODE=false
FORCE_INSTALL=false

# =============================================================================
# 工具函数
# =============================================================================

# 日志函数
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[$timestamp] [INFO]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] [SUCCESS]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] [WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[$timestamp] [ERROR]${NC} $message"
            ;;
        *)
            echo "[$timestamp] $message"
            ;;
    esac
}

# 错误处理
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "此脚本需要root权限运行，请使用sudo"
    fi
}

# 检查操作系统
check_os() {
    if [[ ! -f /etc/os-release ]]; then
        error_exit "无法检测操作系统类型"
    fi
    
    source /etc/os-release
    log "INFO" "检测到操作系统: $PRETTY_NAME"
    
    # 检查是否为支持的系统
    case "$ID" in
        ubuntu|debian|centos|rhel|fedora)
            log "SUCCESS" "操作系统支持"
            ;;
        *)
            log "WARN" "未测试的操作系统，可能存在兼容性问题"
            ;;
    esac
}

# 检查系统依赖
check_dependencies() {
    log "INFO" "检查系统依赖..."
    
    local required_commands=("curl" "jq" "git" "systemctl")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        log "WARN" "缺少以下依赖: ${missing_commands[*]}"
        install_dependencies "${missing_commands[@]}"
    else
        log "SUCCESS" "所有依赖已满足"
    fi
}

# 安装依赖
install_dependencies() {
    local commands=("$@")
    log "INFO" "安装缺少的依赖..."
    
    # 检测包管理器
    if command -v apt-get &> /dev/null; then
        apt-get update
        for cmd in "${commands[@]}"; do
            case "$cmd" in
                "jq")
                    apt-get install -y jq
                    ;;
                "curl")
                    apt-get install -y curl
                    ;;
                "git")
                    apt-get install -y git
                    ;;
                "systemctl")
                    apt-get install -y systemd
                    ;;
            esac
        done
    elif command -v yum &> /dev/null; then
        for cmd in "${commands[@]}"; do
            yum install -y "$cmd"
        done
    elif command -v dnf &> /dev/null; then
        for cmd in "${commands[@]}"; do
            dnf install -y "$cmd"
        done
    else
        error_exit "无法检测包管理器，请手动安装: ${commands[*]}"
    fi
    
    log "SUCCESS" "依赖安装完成"
}

# =============================================================================
# 用户交互
# =============================================================================

# 显示欢迎信息
show_welcome() {
    echo -e "${BLUE}"
    echo "====================================="
    echo "  $SCRIPT_NAME v$SCRIPT_VERSION"
    echo "====================================="
    echo -e "${NC}"
    echo "此脚本将帮助您安装和配置自动化更新系统。"
    echo ""
}

# 收集用户输入
collect_user_input() {
    if [[ "$SILENT_MODE" == "true" ]]; then
        log "INFO" "静默模式，使用默认配置"
        return
    fi
    
    echo "请提供以下配置信息（按Enter使用默认值）："
    echo ""
    
    # 项目根目录
    read -p "项目根目录 [$DEFAULT_PROJECT_ROOT]: " input
    PROJECT_ROOT="${input:-$DEFAULT_PROJECT_ROOT}"
    
    # 运行用户
    read -p "运行用户 [$DEFAULT_USER]: " input
    INSTALL_USER="${input:-$DEFAULT_USER}"
    
    # 运行组
    read -p "运行组 [$DEFAULT_GROUP]: " input
    INSTALL_GROUP="${input:-$DEFAULT_GROUP}"
    
    # 服务名称
    read -p "服务名称 [$DEFAULT_SERVICE_NAME]: " input
    SERVICE_NAME="${input:-$DEFAULT_SERVICE_NAME}"
    
    # 安装方式选择
    echo ""
    echo "选择安装方式："
    echo "1) systemd服务 + 定时器（推荐）"
    echo "2) cron任务"
    echo "3) 仅安装脚本，不配置自动执行"
    
    read -p "请选择 [1]: " choice
    case "${choice:-1}" in
        1)
            INSTALL_SYSTEMD=true
            INSTALL_CRON=false
            ;;
        2)
            INSTALL_SYSTEMD=false
            INSTALL_CRON=true
            ;;
        3)
            INSTALL_SYSTEMD=false
            INSTALL_CRON=false
            ;;
        *)
            log "WARN" "无效选择，使用默认选项（systemd）"
            ;;
    esac
    
    # 确认配置
    echo ""
    echo "配置确认："
    echo "  项目根目录: $PROJECT_ROOT"
    echo "  运行用户: $INSTALL_USER"
    echo "  运行组: $INSTALL_GROUP"
    echo "  服务名称: $SERVICE_NAME"
    echo "  安装systemd: $INSTALL_SYSTEMD"
    echo "  安装cron: $INSTALL_CRON"
    echo ""
    
    if [[ "$FORCE_INSTALL" != "true" ]]; then
        read -p "确认安装？ [y/N]: " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            log "INFO" "安装已取消"
            exit 0
        fi
    fi
}

# =============================================================================
# 安装函数
# =============================================================================

# 创建用户和组
create_user() {
    log "INFO" "检查用户和组..."
    
    # 检查组是否存在
    if ! getent group "$INSTALL_GROUP" > /dev/null 2>&1; then
        log "INFO" "创建组: $INSTALL_GROUP"
        groupadd "$INSTALL_GROUP"
    fi
    
    # 检查用户是否存在
    if ! getent passwd "$INSTALL_USER" > /dev/null 2>&1; then
        log "INFO" "创建用户: $INSTALL_USER"
        useradd -r -g "$INSTALL_GROUP" -s /bin/bash -d "$PROJECT_ROOT" "$INSTALL_USER"
    fi
    
    log "SUCCESS" "用户和组检查完成"
}

# 创建目录结构
create_directories() {
    log "INFO" "创建目录结构..."
    
    local directories=(
        "$PROJECT_ROOT"
        "$PROJECT_ROOT/scripts"
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/backups"
        "$PROJECT_ROOT/tmp"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "INFO" "创建目录: $dir"
        fi
    done
    
    # 设置目录权限
    chown -R "$INSTALL_USER:$INSTALL_GROUP" "$PROJECT_ROOT"
    chmod 755 "$PROJECT_ROOT"
    chmod 755 "$PROJECT_ROOT/scripts"
    chmod 755 "$PROJECT_ROOT/logs"
    chmod 755 "$PROJECT_ROOT/backups"
    chmod 755 "$PROJECT_ROOT/tmp"
    
    log "SUCCESS" "目录结构创建完成"
}

# 复制脚本文件
install_scripts() {
    log "INFO" "安装脚本文件..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local scripts=(
        "auto-update.sh"
        "pre-update.sh"
        "post-update.sh"
        "update-config.conf"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script_dir/$script" ]]; then
            cp "$script_dir/$script" "$PROJECT_ROOT/scripts/"
            chmod +x "$PROJECT_ROOT/scripts/$script"
            log "INFO" "安装脚本: $script"
        else
            log "WARN" "脚本文件不存在: $script"
        fi
    done
    
    # 设置脚本权限
    chown -R "$INSTALL_USER:$INSTALL_GROUP" "$PROJECT_ROOT/scripts"
    
    log "SUCCESS" "脚本文件安装完成"
}

# 配置脚本
configure_scripts() {
    log "INFO" "配置脚本..."
    
    local config_file="$PROJECT_ROOT/scripts/update-config.conf"
    
    if [[ -f "$config_file" ]]; then
        # 更新配置文件中的路径
        sed -i "s|PROJECT_ROOT=.*|PROJECT_ROOT=\"$PROJECT_ROOT\"|g" "$config_file"
        sed -i "s|BACKUP_DIR=.*|BACKUP_DIR=\"$PROJECT_ROOT/backups\"|g" "$config_file"
        sed -i "s|LOG_DIR=.*|LOG_DIR=\"$PROJECT_ROOT/logs\"|g" "$config_file"
        sed -i "s|TMP_DIR=.*|TMP_DIR=\"$PROJECT_ROOT/tmp\"|g" "$config_file"
        
        log "SUCCESS" "配置文件更新完成"
    else
        log "WARN" "配置文件不存在，请手动配置"
    fi
}

# 安装systemd服务
install_systemd_service() {
    if [[ "$INSTALL_SYSTEMD" != "true" ]]; then
        return
    fi
    
    log "INFO" "安装systemd服务..."
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local service_file="/etc/systemd/system/$SERVICE_NAME.service"
    local timer_file="/etc/systemd/system/$SERVICE_NAME.timer"
    
    # 复制并配置服务文件
    if [[ -f "$script_dir/auto-update.service" ]]; then
        cp "$script_dir/auto-update.service" "$service_file"
        
        # 更新服务文件中的配置
        sed -i "s|User=.*|User=$INSTALL_USER|g" "$service_file"
        sed -i "s|Group=.*|Group=$INSTALL_GROUP|g" "$service_file"
        sed -i "s|WorkingDirectory=.*|WorkingDirectory=$PROJECT_ROOT|g" "$service_file"
        sed -i "s|ExecStart=.*|ExecStart=$PROJECT_ROOT/scripts/auto-update.sh --silent|g" "$service_file"
        sed -i "s|ReadWritePaths=.*|ReadWritePaths=$PROJECT_ROOT|g" "$service_file"
        sed -i "s|EnvironmentFile=.*|EnvironmentFile=-$PROJECT_ROOT/.env|g" "$service_file"
        
        log "INFO" "服务文件已安装: $service_file"
    fi
    
    # 复制并配置定时器文件
    if [[ -f "$script_dir/auto-update.timer" ]]; then
        cp "$script_dir/auto-update.timer" "$timer_file"
        sed -i "s|Requires=.*|Requires=$SERVICE_NAME.service|g" "$timer_file"
        
        log "INFO" "定时器文件已安装: $timer_file"
    fi
    
    # 重新加载systemd配置
    systemctl daemon-reload
    
    # 启用服务
    systemctl enable "$SERVICE_NAME.timer"
    systemctl start "$SERVICE_NAME.timer"
    
    log "SUCCESS" "systemd服务安装完成"
}

# 安装cron任务
install_cron_job() {
    if [[ "$INSTALL_CRON" != "true" ]]; then
        return
    fi
    
    log "INFO" "安装cron任务..."
    
    local cron_file="/etc/cron.d/$SERVICE_NAME"
    
    # 创建cron任务文件
    cat > "$cron_file" << EOF
# Navigation System Auto Update
# 每天凌晨2点执行更新检查
0 2 * * * $INSTALL_USER $PROJECT_ROOT/scripts/auto-update.sh --silent
EOF
    
    chmod 644 "$cron_file"
    
    log "SUCCESS" "cron任务安装完成"
}

# =============================================================================
# 验证安装
# =============================================================================

verify_installation() {
    log "INFO" "验证安装..."
    
    local errors=0
    
    # 检查脚本文件
    local scripts=("auto-update.sh" "pre-update.sh" "post-update.sh" "update-config.conf")
    for script in "${scripts[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/scripts/$script" ]]; then
            log "ERROR" "脚本文件缺失: $script"
            ((errors++))
        fi
    done
    
    # 检查目录权限
    if [[ ! -w "$PROJECT_ROOT" ]]; then
        log "ERROR" "项目目录无写权限: $PROJECT_ROOT"
        ((errors++))
    fi
    
    # 检查systemd服务
    if [[ "$INSTALL_SYSTEMD" == "true" ]]; then
        if ! systemctl is-enabled "$SERVICE_NAME.timer" &> /dev/null; then
            log "ERROR" "systemd定时器未启用"
            ((errors++))
        fi
    fi
    
    # 检查cron任务
    if [[ "$INSTALL_CRON" == "true" ]]; then
        if [[ ! -f "/etc/cron.d/$SERVICE_NAME" ]]; then
            log "ERROR" "cron任务文件不存在"
            ((errors++))
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        log "SUCCESS" "安装验证通过"
        return 0
    else
        log "ERROR" "安装验证失败，发现 $errors 个错误"
        return 1
    fi
}

# =============================================================================
# 显示安装结果
# =============================================================================

show_installation_summary() {
    echo ""
    echo -e "${GREEN}====================================="
    echo "  安装完成！"
    echo -e "=====================================${NC}"
    echo ""
    echo "安装信息："
    echo "  项目目录: $PROJECT_ROOT"
    echo "  脚本目录: $PROJECT_ROOT/scripts"
    echo "  日志目录: $PROJECT_ROOT/logs"
    echo "  备份目录: $PROJECT_ROOT/backups"
    echo "  运行用户: $INSTALL_USER"
    echo ""
    
    if [[ "$INSTALL_SYSTEMD" == "true" ]]; then
        echo "systemd服务管理："
        echo "  查看状态: systemctl status $SERVICE_NAME.timer"
        echo "  查看日志: journalctl -u $SERVICE_NAME.service -f"
        echo "  手动执行: systemctl start $SERVICE_NAME.service"
        echo ""
    fi
    
    if [[ "$INSTALL_CRON" == "true" ]]; then
        echo "cron任务管理："
        echo "  查看任务: cat /etc/cron.d/$SERVICE_NAME"
        echo "  查看日志: grep $SERVICE_NAME /var/log/syslog"
        echo ""
    fi
    
    echo "下一步操作："
    echo "1. 编辑配置文件: $PROJECT_ROOT/scripts/update-config.conf"
    echo "2. 设置GitHub仓库信息"
    echo "3. 测试更新脚本: $PROJECT_ROOT/scripts/auto-update.sh --check-only"
    echo ""
    echo "更多信息请查看: $PROJECT_ROOT/scripts/README.md"
}

# =============================================================================
# 命令行参数处理
# =============================================================================

show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -s, --silent              静默安装，使用默认配置"
    echo "  -f, --force               强制安装，不询问确认"
    echo "  -u, --user USER           指定运行用户（默认: $DEFAULT_USER）"
    echo "  -g, --group GROUP         指定运行组（默认: $DEFAULT_GROUP）"
    echo "  -p, --project-root PATH   指定项目根目录（默认: $DEFAULT_PROJECT_ROOT）"
    echo "  -n, --service-name NAME   指定服务名称（默认: $DEFAULT_SERVICE_NAME）"
    echo "  --systemd                 安装systemd服务（默认）"
    echo "  --cron                    安装cron任务"
    echo "  --no-auto                 仅安装脚本，不配置自动执行"
    echo "  -h, --help                显示此帮助信息"
    echo "  --version                 显示版本信息"
    echo ""
    echo "示例:"
    echo "  $0                        # 交互式安装"
    echo "  $0 --silent               # 静默安装"
    echo "  $0 --cron --user myuser   # 使用cron和自定义用户"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--silent)
                SILENT_MODE=true
                shift
                ;;
            -f|--force)
                FORCE_INSTALL=true
                shift
                ;;
            -u|--user)
                INSTALL_USER="$2"
                shift 2
                ;;
            -g|--group)
                INSTALL_GROUP="$2"
                shift 2
                ;;
            -p|--project-root)
                PROJECT_ROOT="$2"
                shift 2
                ;;
            -n|--service-name)
                SERVICE_NAME="$2"
                shift 2
                ;;
            --systemd)
                INSTALL_SYSTEMD=true
                INSTALL_CRON=false
                shift
                ;;
            --cron)
                INSTALL_SYSTEMD=false
                INSTALL_CRON=true
                shift
                ;;
            --no-auto)
                INSTALL_SYSTEMD=false
                INSTALL_CRON=false
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            --version)
                echo "$SCRIPT_NAME v$SCRIPT_VERSION"
                exit 0
                ;;
            *)
                log "ERROR" "未知参数: $1"
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
    parse_arguments "$@"
    
    # 显示欢迎信息
    if [[ "$SILENT_MODE" != "true" ]]; then
        show_welcome
    fi
    
    # 系统检查
    check_root
    check_os
    check_dependencies
    
    # 收集用户输入
    collect_user_input
    
    log "INFO" "开始安装自动化更新系统..."
    
    # 执行安装
    create_user
    create_directories
    install_scripts
    configure_scripts
    install_systemd_service
    install_cron_job
    
    # 验证安装
    if verify_installation; then
        show_installation_summary
        log "SUCCESS" "自动化更新系统安装完成！"
    else
        error_exit "安装验证失败，请检查错误信息"
    fi
}

# 执行主函数
main "$@"