#!/bin/bash

# 设置错误时退出
set -e

# 设置语言环境为UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# 设置git不对中文文件名转义
git config --global core.quotepath false

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 定义打印彩色文本的函数
print_color() {
    printf "%b%s%b\n" "$1" "$2" "$NC"
}

# 记录操作状态的变量
STATUS_FILES_ADDED=false
STATUS_CHANGES_COMMITTED=false
STATUS_COMMIT_HASH=""
STATUS_BRANCH=""
STATUS_COMMIT_MESSAGE=""

# 显示操作状态和恢复建议
show_status_and_recovery() {
    print_color "$BLUE" "=== 操作状态 ==="
    print_color "" "1. 文件暂存: $STATUS_FILES_ADDED"
    print_color "" "2. 更改提交: $STATUS_CHANGES_COMMITTED"
    if [ ! -z "$STATUS_COMMIT_HASH" ]; then
        print_color "" "3. 提交哈希: $STATUS_COMMIT_HASH"
    fi
    print_color "" "4. 目标分支: $STATUS_BRANCH"
    print_color "" "5. 提交信息: $STATUS_COMMIT_MESSAGE"

    print_color "$BLUE" "=== 恢复建议 ==="
    if [ "$STATUS_CHANGES_COMMITTED" = true ]; then
        print_color "" "您的更改已经提交到本地仓库。要重新推送，请执行："
        print_color "" "git push origin $STATUS_BRANCH"
        print_color "" "\n如果想要撤销提交，请执行："
        print_color "" "git reset --soft HEAD^"
    elif [ "$STATUS_FILES_ADDED" = true ]; then
        print_color "" "文件已暂存但未提交。要继续，请执行："
        print_color "" "git commit -m \"$STATUS_COMMIT_MESSAGE\""
        print_color "" "git push origin $STATUS_BRANCH"
        print_color "" "\n如果想要撤销暂存，请执行："
        print_color "" "git reset"
    fi
}

# 错误处理函数
handle_error() {
    print_color "$RED" "执行过程中发生错误"
    show_status_and_recovery
    exit 1
}

# 设置错误处理
trap 'handle_error' ERR

# 提交历史管理函数
show_commit_history() {
    local format="$1"
    local search_term="$2"
    local num_commits="$3"

    if [ -z "$num_commits" ]; then
        num_commits=10
    fi

    if [ -z "$format" ]; then
        format="%C(yellow)%h%Creset -%C(bold green)%d%Creset %s %C(dim)(%cr) %C(bold blue)<%an>%Creset"
    fi

    if [ -n "$search_term" ]; then
        git log -n "$num_commits" --pretty=format:"$format" --grep="$search_term"
    else
        git log -n "$num_commits" --pretty=format:"$format"
    fi
}

show_commit_details() {
    local commit_hash="$1"
    if [ -z "$commit_hash" ]; then
        print_color "$RED" "错误: 未指定提交哈希"
        return 1
    fi

    print_color "$BLUE" "=== 提交详情 ==="
    git show --color --pretty=fuller "$commit_hash"
}

revert_commit() {
    local commit_hash="$1"
    if [ -z "$commit_hash" ]; then
        print_color "$RED" "错误: 未指定提交哈希"
        return 1
    fi

    print_color "$YELLOW" "即将撤销以下提交:"
    git show --oneline --no-patch "$commit_hash"
    read -e -p "确认撤销? (y/n): " confirm
    if [ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" = "y" ]; then
        git revert "$commit_hash"
        print_color "$GREEN" "已成功撤销提交"
    else
        print_color "" "操作已取消"
    fi
}

# 处理仓库分叉情况
handle_diverged_branches() {
    local current_branch=$1
    
    # 获取本地和远程的提交数量差异
    local ahead_behind=$(git rev-list --left-right --count HEAD...origin/$current_branch)
    local ahead=$(echo $ahead_behind | cut -f1)
    local behind=$(echo $ahead_behind | cut -f2)
    
    print_color "$YELLOW" "检测到本地和远程仓库已分叉"
    print_color "$BLUE" "本地领先 $ahead 个提交，落后 $behind 个提交"
    
    # 如果本地落后较多，建议使用rebase
    if [ $behind -gt $ahead ]; then
        print_color "$YELLOW" "建议使用变基(rebase)来同步远程更改..."
        read -p "是否执行变基操作？(Y/n): " choice
        choice=${choice:-Y}
        
        if [[ $choice =~ ^[Yy]$ ]]; then
            print_color "$BLUE" "正在变基到远程更改..."
            if git rebase "origin/$current_branch"; then
                print_color "$GREEN" "变基成功"
                return 0
            else
                print_color "$RED" "变基过程中遇到冲突"
                print_color "$YELLOW" "请手动解决冲突后运行 'git rebase --continue'"
                exit 1
            fi
        fi
    fi
    
    # 显示其他选项
    print_color "$BLUE" "请选择处理方式："
    echo "1) 合并远程更改 (git merge)"
    echo "2) 变基到远程更改 (git rebase)"
    echo "3) 强制推送本地更改 (git push --force)"
    echo "4) 退出并手动处理"
    
    read -p "请输入选项 (1-4): " choice
    
    case $choice in
        1)
            print_color "$YELLOW" "正在合并远程更改..."
            if git merge "origin/$current_branch"; then
                print_color "$GREEN" "合并成功"
            else
                print_color "$RED" "合并过程中遇到冲突"
                print_color "$YELLOW" "请手动解决冲突后提交更改"
                exit 1
            fi
            ;;
        2)
            print_color "$YELLOW" "正在变基到远程更改..."
            if git rebase "origin/$current_branch"; then
                print_color "$GREEN" "变基成功"
            else
                print_color "$RED" "变基过程中遇到冲突"
                print_color "$YELLOW" "请手动解决冲突后运行 'git rebase --continue'"
                exit 1
            fi
            ;;
        3)
            print_color "$RED" "警告：强制推送将覆盖远程 $behind 个提交！"
            read -p "确定要继续吗？(y/N): " confirm
            if [[ $confirm == [yY] ]]; then
                git push --force origin "$current_branch"
                print_color "$GREEN" "强制推送成功"
            else
                print_color "$YELLOW" "操作已取消"
                exit 0
            fi
            ;;
        4)
            print_color "$YELLOW" "已退出。请手动解决冲突后再运行脚本"
            exit 0
            ;;
        *)
            print_color "$RED" "无效的选项"
            exit 1
            ;;
    esac
}

# 获取提交类型和表情
get_commit_type() {
    print_color "$BLUE" "请选择提交类型："
    echo "1) ✨ feat: 新功能"
    echo "2) 🐛 fix: 修复"
    echo "3) 📝 docs: 文档"
    echo "4) 🎨 style: 格式"
    echo "5) ♻️ refactor: 重构"
    echo "6) ⚡️ perf: 性能"
    echo "7) ✅ test: 测试"
    echo "8) 🔧 chore: 构建"
    echo "9) 🚀 ci: 集成"
    echo "0) 💾 auto: 自动提交"
    
    read -p "请选择提交类型 (0-9): " type_choice
    
    case $type_choice in
        1) echo "✨ feat: ";;
        2) echo "🐛 fix: ";;
        3) echo "📝 docs: ";;
        4) echo "🎨 style: ";;
        5) echo "♻️ refactor: ";;
        6) echo "⚡️ perf: ";;
        7) echo "✅ test: ";;
        8) echo "🔧 chore: ";;
        9) echo "🚀 ci: ";;
        *) echo "💾 auto: ";;
    esac
}

# 自动处理未暂存的更改
handle_unstaged_changes() {
    if [[ -n $(git status -s) ]]; then
        print_color "$YELLOW" "检测到未暂存的更改..."
        
        # 获取工作目录中的更改
        local changes=$(git status --porcelain)
        
        # 自动暂存所有更改
        git add -A
        STATUS_FILES_ADDED=true
        print_color "$GREEN" "已自动暂存所有更改"
        
        # 获取提交类型和表情
        local commit_prefix=$(get_commit_type)
        
        # 自动提交
        local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        local commit_msg="${commit_prefix}自动提交于 $timestamp\n\n更改文件:\n$changes"
        git commit -m "$commit_msg"
        STATUS_CHANGES_COMMITTED=true
        STATUS_COMMIT_HASH=$(git rev-parse HEAD)
        STATUS_COMMIT_MESSAGE="$commit_msg"
        print_color "$GREEN" "已自动提交更改"
        
        # 显示提交信息
        print_color "$BLUE" "提交详情："
        git show --stat HEAD
    fi
}

# 主菜单函数
show_main_menu() {
    while true; do
        print_color "$BLUE" "=== Git 操作菜单 ==="
        print_color "" "1. 提交更改"
        print_color "" "2. 查看提交历史"
        print_color "" "3. 搜索提交"
        print_color "" "4. 查看提交详情"
        print_color "" "5. 撤销提交"
        print_color "" "6. 退出"
        
        read -e -p "请选择操作 (1-6): " choice
        case $choice in
            1)
                commit_changes
                ;;
            2)
                read -e -p "查看最近几条记录 (默认10): " num_commits
                [ -z "$num_commits" ] && num_commits=10
                show_commit_history "" "" "$num_commits"
                ;;
            3)
                read -e -p "请输入搜索关键词: " search_term
                if [ -n "$search_term" ]; then
                    show_commit_history "" "$search_term" 50
                fi
                ;;
            4)
                read -e -p "请输入提交哈希: " commit_hash
                if [ -n "$commit_hash" ]; then
                    show_commit_details "$commit_hash"
                fi
                ;;
            5)
                read -e -p "请输入要撤销的提交哈希: " commit_hash
                if [ -n "$commit_hash" ]; then
                    revert_commit "$commit_hash"
                fi
                ;;
            6)
                print_color "" "退出程序"
                exit 0
                ;;
            *)
                print_color "$RED" "无效的选择"
                ;;
        esac
    done
}

# 提交更改函数
commit_changes() {
    # 检查远程仓库更新
    print_color "$BLUE" "正在检查远程仓库更新..."
    
    # 获取当前分支名
    STATUS_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    # 获取远程更新
    git fetch origin
    
    # 检查本地分支与远程分支的差异
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    BASE=$(git merge-base @ @{u})
    
    if [ "$REMOTE" = "$BASE" ]; then
        # 本地领先于远程，可以继续
        print_color "$GREEN" "本地仓库已是最新"
    elif [ "$LOCAL" = "$BASE" ]; then
        # 远程领先于本地，需要更新
        print_color "$YELLOW" "检测到远程仓库有更新，正在拉取..."
        git pull origin "$STATUS_BRANCH"
        print_color "$GREEN" "成功更新本地仓库"
    else
        handle_diverged_branches "$STATUS_BRANCH"
    fi

    # 检查是否有未提交的更改
    if [ -z "$(git status --porcelain)" ]; then
        print_color "$YELLOW" "没有发现需要提交的更改"
        read -e -p "是否继续? (y/n): " continue
        if [ "$(echo "$continue" | tr '[:upper:]' '[:lower:]')" != "y" ]; then
            print_color "" "操作已取消"
            exit 0
        fi
    fi

    # 显示当前Git状态
    print_color "" "当前Git状态:"
    git status -s

    # 选择提交方式
    print_color "$YELLOW" "请选择提交方式:"
    print_color "" "1. 提交所有更改 (git add .)"
    print_color "" "2. 交互式选择文件 (git add -p)"
    print_color "" "3. 选择已更改的文件"
    read -e -p "请选择 (1-3): " choice

    case $choice in
        1)
            git add .
            STATUS_FILES_ADDED=true
            ;;
        2)
            git add -p
            STATUS_FILES_ADDED=true
            ;;
        3)
            # 获取已更改的文件列表
            files=()
            while IFS= read -r line; do
                file="${line#???}"
                files+=("$file")
            done < <(git status --porcelain)
            
            if [ ${#files[@]} -eq 0 ]; then
                print_color "$RED" "没有发现已更改的文件"
                exit 1
            fi

            # 显示文件列表并让用户选择
            print_color "$YELLOW" "已更改的文件列表:"
            for i in "${!files[@]}"; do
                num=$((i + 1))
                print_color "" "$num. ${files[$i]}"
            done

            print_color "$YELLOW" "请输入要添加的文件编号（多个文件用空格分隔，输入 'a' 选择全部）:"
            read -r selections

            if [ "$selections" = "a" ]; then
                for file in "${files[@]}"; do
                    if git add "$file" 2>/dev/null; then
                        print_color "$GREEN" "成功添加: $file"
                    else
                        print_color "$RED" "添加失败: $file"
                        exit 1
                    fi
                done
            else
                for selection in $selections; do
                    index=$((selection-1))
                    if [ "$index" -ge 0 ] && [ "$index" -lt "${#files[@]}" ]; then
                        file="${files[$index]}"
                        if git add "$file" 2>/dev/null; then
                            print_color "$GREEN" "成功添加: $file"
                        else
                            print_color "$RED" "添加失败: $file"
                            exit 1
                        fi
                    else
                        print_color "$RED" "无效的选择: $selection"
                        exit 1
                    fi
                done
            fi
            STATUS_FILES_ADDED=true
            ;;
        *)
            print_color "$RED" "错误: 无效的选择"
            exit 1
            ;;
    esac

    # 显示已暂存的更改
    print_color "$YELLOW" "已暂存的更改:"
    git status -s

    # 选择提交信息类型
    declare -a commit_types=(
        "feat: ✨ 新功能"
        "fix: 🐛 修复bug"
        "docs: 📝 文档更新"
        "style: 💄 代码格式"
        "refactor: ♻️ 代码重构"
        "perf: ⚡️ 性能优化"
        "test: ✅ 测试相关"
        "build: 📦️ 构建相关"
        "ci: 👷 CI/CD相关"
        "chore: 🔨 其他更改"
        "init: 🎉 初始化"
        "security: 🔒 安全更新"
        "deps: 📌 依赖更新"
        "i18n: 🌐 国际化"
        "typo: ✍️ 拼写修正"
        "revert: ⏪️ 回退更改"
        "merge: 🔀 合并分支"
        "release: 🏷️ 发布版本"
        "deploy: 🚀 部署相关"
        "ui: 🎨 界面相关"
        "custom: 🎯 自定义格式"
    )

    for i in "${!commit_types[@]}"; do
        print_color "" "$((i+1)). ${commit_types[i]}"
    done
    read -e -p "请选择 (1-${#commit_types[@]}): " type_choice

    if [ "$type_choice" -ge 1 ] && [ "$type_choice" -le ${#commit_types[@]} ]; then
        selected_type=${commit_types[$((type_choice-1))]}
    else
        print_color "$RED" "错误: 无效的选择"
        exit 1
    fi

    # 如果选择自定义格式，让用户选择表情
    if [ "$type_choice" -eq ${#commit_types[@]} ]; then
        declare -a emojis=(
            "🎨 - 改进代码结构/格式"
            "⚡️ - 提升性能"
            "🔥 - 删除代码/文件"
            "🐛 - 修复 bug"
            "🚑️ - 重要补丁"
            "✨ - 引入新功能"
            "📝 - 撰写文档"
            "🚀 - 部署功能"
            "💄 - UI/样式更新"
            "🎉 - 初次提交"
            "✅ - 增加测试"
            "🔒️ - 修复安全问题"
            "🔐 - 添加或更新密钥"
            "🔖 - 发布/版本标签"
            "🚨 - 修复编译器/linter警告"
            "🚧 - 工作进行中"
            "💚 - 修复CI构建问题"
            "⬇️ - 降级依赖"
            "⬆️ - 升级依赖"
            "📌 - 固定依赖版本"
            "👷 - 添加CI构建系统"
            "📈 - 添加分析或跟踪代码"
            "♻️ - 重构代码"
            "➕ - 添加依赖"
            "➖ - 删除依赖"
            "🔧 - 修改配置文件"
            "🔨 - 重大重构"
            "🌐 - 国际化与本地化"
            "✏️ - 修复拼写错误"
            "💩 - 需要改进的代码"
            "⏪️ - 回退更改"
            "🔀 - 合并分支"
            "📦️ - 更新编译文件"
            "👽️ - 更新外部API"
            "🚚 - 移动/重命名文件"
            "📄 - 添加许可证"
            "💥 - 重大更改"
            "🍱 - 添加资源"
            "♿️ - 提高可访问性"
            "🔊 - 添加日志"
            "🔇 - 删除日志"
        )

        print_color "$YELLOW" "请选择表情:"
        for i in "${!emojis[@]}"; do
            print_color "" "$((i+1)). ${emojis[i]}"
        done
        
        read -e -p "请选择 (1-${#emojis[@]}): " emoji_choice
        
        if [ "$emoji_choice" -ge 1 ] && [ "$emoji_choice" -le ${#emojis[@]} ]; then
            # 提取选中表情的emoji部分（第一个空格之前的部分）
            selected_emoji=$(echo "${emojis[$((emoji_choice-1))]}" | cut -d' ' -f1)
            
            read -e -p "请输入提交类型: " custom_type
            commit_prefix="$custom_type: $selected_emoji"
        else
            print_color "$RED" "错误: 无效的选择"
            exit 1
        fi
    else
        commit_prefix=$(echo "$selected_type" | cut -d' ' -f1,2)
    fi

    # 获取提交描述
    read -e -p "请输入提交描述: " commit_desc
    if [ -z "$commit_desc" ]; then
        print_color "$RED" "提交描述不能为空"
        exit 1
    fi

    # 组合完整的提交信息
    message="$commit_prefix $commit_desc"
    STATUS_COMMIT_MESSAGE="$message"

    # 获取分支名称
    read -e -p "请输入分支名称 (默认是 $current_branch): " branch
    if [ -z "$branch" ]; then
        branch=$current_branch
    fi
    STATUS_BRANCH="$branch"

    print_color "$YELLOW" "即将执行以下操作:"
    print_color "" "1. git commit -m \"$message\""
    print_color "" "2. git push origin $branch"

    read -e -p "确认执行? (y/n): " confirm
    if [ "$(echo "$confirm" | tr '[:upper:]' '[:lower:]')" != "y" ]; then
        print_color "" "操作已取消"
        exit 0
    fi

    # 执行git命令
    print_color "$YELLOW" "正在执行git操作..."

    print_color "$YELLOW" "1. 提交更改..."
    git commit -m "$message"
    STATUS_CHANGES_COMMITTED=true
    STATUS_COMMIT_HASH=$(git rev-parse HEAD)

    print_color "$YELLOW" "2. 推送到远程..."
    if git push origin "$branch"; then
        print_color "$GREEN" "所有操作已成功完成！"
    else
        print_color "$RED" "推送失败，请检查网络连接或远程仓库状态"
        show_status_and_recovery
        exit 1
    fi
}

# 检查是否在git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_color "$RED" "错误: 当前目录不是git仓库"
    exit 1
fi

# 在检查远程更新之前处理未暂存的更改
handle_unstaged_changes

# 获取当前分支
current_branch=$(git rev-parse --abbrev-ref HEAD)

# 显示主菜单
show_main_menu
