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
    printf "%b%s%b\n" "$1" "$2" "$NC" >&2
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

# 处理分叉的分支
handle_diverged_branches() {
    local ahead=$1
    local behind=$2
    
    print_color "$YELLOW" "检测到本地和远程仓库已分叉"
    print_color "$BLUE" "本地领先 $ahead 个提交，落后 $behind 个提交"
    
    # 先处理未暂存的更改
    local changes=$(git status --porcelain)
    if [[ -n $changes ]]; then
        print_color "$YELLOW" "检测到未暂存的更改，先进行提交..."
        handle_unstaged_changes
    fi
    
    # 现在处理分支分叉
    echo "请选择处理方式："
    echo "1) 合并远程更改 (git merge)"
    echo "2) 变基到远程更改 (git rebase)"
    echo "3) 强制推送本地更改 (git push --force)"
    echo "4) 退出并手动处理"
    
    local choice
    while true; do
        read -p "请输入选项 (1-4): " choice
        case $choice in
            1)
                print_color "$BLUE" "正在合并远程更改..."
                if git merge "origin/$(git rev-parse --abbrev-ref HEAD)"; then
                    print_color "$GREEN" "合并成功"
                    git push origin "$(git rev-parse --abbrev-ref HEAD)"
                    exit 0
                else
                    print_color "$RED" "合并过程中遇到冲突"
                    print_color "$YELLOW" "请手动解决冲突后重新运行此脚本"
                    exit 1
                fi
                ;;
            2)
                print_color "$BLUE" "正在变基到远程更改..."
                if git rebase "origin/$(git rev-parse --abbrev-ref HEAD)"; then
                    print_color "$GREEN" "变基成功"
                    git push origin "$(git rev-parse --abbrev-ref HEAD)" --force-with-lease
                    exit 0
                else
                    print_color "$RED" "变基过程中遇到冲突"
                    print_color "$YELLOW" "请手动解决冲突后运行 'git rebase --continue'"
                    exit 1
                fi
                ;;
            3)
                print_color "$RED" "警告：强制推送可能会覆盖远程更改"
                read -p "确定要继续吗？(y/n): " confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    git push origin "$(git rev-parse --abbrev-ref HEAD)" --force-with-lease
                    exit 0
                else
                    print_color "$YELLOW" "操作已取消"
                    exit 1
                fi
                ;;
            4)
                print_color "$YELLOW" "已退出，请手动处理分支分叉"
                exit 1
                ;;
            *)
                print_color "$RED" "无效的选项，请重新选择"
                ;;
        esac
    done
}

# 检查远程更新
check_remote_updates() {
    print_color "$BLUE" "正在检查远程仓库更新..."
    
    # 获取远程更新
    git fetch origin
    
    # 获取当前分支
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    # 检查是否有未暂存的更改
    local changes=$(git status --porcelain)
    
    # 获取本地和远程的提交差异
    local ahead=$(git rev-list "origin/$current_branch..$current_branch" --count)
    local behind=$(git rev-list "$current_branch..origin/$current_branch" --count)
    
    # 如果有未暂存的更改，先处理它们
    if [[ -n $changes ]]; then
        handle_unstaged_changes
        # 重新获取提交差异
        ahead=$(git rev-list "origin/$current_branch..$current_branch" --count)
        behind=$(git rev-list "$current_branch..origin/$current_branch" --count)
    fi
    
    # 检查分支是否分叉
    if [[ $ahead -gt 0 && $behind -gt 0 ]]; then
        handle_diverged_branches "$ahead" "$behind"
    elif [[ $behind -gt 0 ]]; then
        print_color "$YELLOW" "检测到远程仓库有更新"
        handle_remote_updates
    elif [[ $ahead -gt 0 ]]; then
        print_color "$GREEN" "本地领先远程 $ahead 个提交"
        git push origin "$current_branch"
    else
        print_color "$GREEN" "本地和远程仓库已同步"
    fi
}

# 获取提交类型和表情
get_commit_type() {
    local type_choice
    
    # 显示菜单到stderr
    print_color "$BLUE" "=== 请选择提交类型 ===" >&2
    cat >&2 << EOF
┌────────┬─────────────┬──────────────────┐
│ 选项   │   类型      │      说明        │
├────────┼─────────────┼──────────────────┤
│   1    │ ✨ feat     │    新功能        │
│   2    │ 🐛 fix      │    修复问题      │
│   3    │ 📝 docs     │    文档更新      │
│   4    │ 🎨 style    │    代码格式      │
│   5    │ ♻️  refactor │    代码重构      │
│   6    │ ⚡️ perf     │    性能优化      │
│   7    │ ✅ test     │    测试相关      │
│   8    │ 🔧 chore    │    构建相关      │
│   9    │ 🚀 ci       │    CI/CD相关     │
│  10    │ 🔒 security │    安全更新      │
│  11    │ 📌 deps     │    依赖更新      │
│  12    │ 🌐 i18n     │    国际化        │
│  13    │ ✍️  typo     │    拼写修正      │
│  14    │ ⏪️ revert   │    回退更改      │
│  15    │ 🔀 merge    │    合并分支      │
│  16    │ 🏷️  release  │    发布版本      │
│  17    │ 🚀 deploy   │    部署相关      │
│  18    │ 🎨 ui       │    界面相关      │
│   0    │ 💾 custom   │    自定义格式    │
└────────┴─────────────┴──────────────────┘
EOF
    echo >&2
    
    while true; do
        read -p "请选择提交类型 (0-18): " type_choice < /dev/tty
        
        case $type_choice in
            1) printf "✨ feat: "; return;;
            2) printf "🐛 fix: "; return;;
            3) printf "📝 docs: "; return;;
            4) printf "🎨 style: "; return;;
            5) printf "♻️ refactor: "; return;;
            6) printf "⚡️ perf: "; return;;
            7) printf "✅ test: "; return;;
            8) printf "🔧 chore: "; return;;
            9) printf "🚀 ci: "; return;;
            10) printf "🔒 security: "; return;;
            11) printf "📌 deps: "; return;;
            12) printf "🌐 i18n: "; return;;
            13) printf "✍️ typo: "; return;;
            14) printf "⏪️ revert: "; return;;
            15) printf "🔀 merge: "; return;;
            16) printf "🏷️ release: "; return;;
            17) printf "🚀 deploy: "; return;;
            18) printf "🎨 ui: "; return;;
            0)
                read -p "请输入自定义提交类型 (不含冒号): " custom_type < /dev/tty
                if [ -n "$custom_type" ]; then
                    printf "💾 %s: " "$custom_type"
                else
                    print_color "$RED" "错误: 自定义类型不能为空" >&2
                    continue
                fi
                return;;
            *)
                print_color "$RED" "无效的选项，请重新选择" >&2;;
        esac
    done
}

# 处理远程分支更新
handle_remote_updates() {
    # 先尝试拉取远程更新
    print_color "$BLUE" "正在拉取远程更新..."
    if ! git pull origin "$(git rev-parse --abbrev-ref HEAD)"; then
        print_color "$RED" "拉取远程更新失败，请手动解决冲突"
        exit 1
    fi
    print_color "$GREEN" "已成功拉取远程更新"
}

# 自动处理未暂存的更改
handle_unstaged_changes() {
    # 先检查是否有未暂存的更改
    local changes=$(git status --porcelain)
    if [[ -n $changes ]]; then
        print_color "$YELLOW" "检测到未暂存的更改..."
        print_color "$BLUE" "更改的文件："
        echo "$changes"
        echo
        
        # 获取提交类型和表情
        local commit_prefix
        commit_prefix=$(get_commit_type)
        
        # 获取提交描述
        local commit_desc
        read -e -p "请输入提交描述: " commit_desc < /dev/tty
        if [ -z "$commit_desc" ]; then
            print_color "$RED" "错误: 提交描述不能为空"
            exit 1
        fi
        
        # 自动暂存所有更改
        git add -A
        STATUS_FILES_ADDED=true
        print_color "$GREEN" "已自动暂存所有更改"
        
        # 组合提交信息并提交
        git commit -m "${commit_prefix}${commit_desc}"
        STATUS_CHANGES_COMMITTED=true
        STATUS_COMMIT_HASH=$(git rev-parse HEAD)
        STATUS_COMMIT_MESSAGE="${commit_prefix}${commit_desc}"
        print_color "$GREEN" "已自动提交更改"
        
        # 显示提交信息
        print_color "$BLUE" "提交详情："
        git show --stat HEAD
        
        # 先拉取远程更新
        handle_remote_updates
        
        # 自动推送到远程
        print_color "$BLUE" "正在推送到远程仓库..."
        if git push origin "$(git rev-parse --abbrev-ref HEAD)"; then
            print_color "$GREEN" "成功推送到远程仓库"
            exit 0
        else
            print_color "$RED" "推送失败，请检查远程仓库状态"
            exit 1
        fi
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

# 选择性添加文件
select_files_to_add() {
    # 获取已更改但未暂存的文件列表
    local changed_files=($(git status --porcelain | grep -E '^\s*M' | sed 's/^\s*M\s*//'))
    
    if [ ${#changed_files[@]} -eq 0 ]; then
        print_color "$YELLOW" "没有需要添加的文件"
        return 1
    fi
    
    print_color "$BLUE" "已更改的文件列表:"
    for i in "${!changed_files[@]}"; do
        echo "$((i+1)). ${changed_files[i]}"
    done
    
    local choice
    read -p "请输入要添加的文件编号（多个文件用空格分隔，输入 'a' 选择全部）: " choice
    
    if [ "$choice" = "a" ]; then
        # 使用 git add 时保持在仓库根目录
        local repo_root=$(git rev-parse --show-toplevel)
        cd "$repo_root" || exit 1
        
        for file in "${changed_files[@]}"; do
            if git add "$file"; then
                print_color "$GREEN" "已添加: $file"
            else
                print_color "$RED" "添加失败: $file"
            fi
        done
    else
        # 处理多个文件编号
        local selected_files=()
        for num in $choice; do
            if [ "$num" -ge 1 ] && [ "$num" -le "${#changed_files[@]}" ]; then
                selected_files+=("${changed_files[$((num-1))]}")
            else
                print_color "$RED" "无效的文件编号: $num"
                return 1
            fi
        done
        
        # 使用 git add 时保持在仓库根目录
        local repo_root=$(git rev-parse --show-toplevel)
        cd "$repo_root" || exit 1
        
        for file in "${selected_files[@]}"; do
            if git add "$file"; then
                print_color "$GREEN" "已添加: $file"
            else
                print_color "$RED" "添加失败: $file"
            fi
        done
    fi
}

# 提交更改
commit_changes() {
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        print_color "$YELLOW" "当前Git状态:"
        git status -s
        
        print_color "$BLUE" "请选择提交方式:"
        echo "1. 提交所有更改 (git add .)"
        echo "2. 交互式选择文件 (git add -p)"
        echo "3. 选择已更改的文件"
        
        local choice
        while true; do
            read -p "请选择 (1-3): " choice
            case $choice in
                1)
                    # 使用 git add 时保持在仓库根目录
                    local repo_root=$(git rev-parse --show-toplevel)
                    cd "$repo_root" || exit 1
                    git add .
                    break
                    ;;
                2)
                    git add -p
                    break
                    ;;
                3)
                    select_files_to_add
                    break
                    ;;
                *)
                    print_color "$RED" "无效的选项，请重新选择"
                    ;;
            esac
        done
        
        # 获取提交类型和表情
        local commit_prefix
        commit_prefix=$(get_commit_type)
        
        # 获取提交描述
        local commit_desc
        read -e -p "请输入提交描述: " commit_desc < /dev/tty
        if [ -z "$commit_desc" ]; then
            print_color "$RED" "错误: 提交描述不能为空"
            exit 1
        fi
        
        # 组合提交信息并提交
        git commit -m "${commit_prefix}${commit_desc}"
        STATUS_CHANGES_COMMITTED=true
        STATUS_COMMIT_HASH=$(git rev-parse HEAD)
        STATUS_COMMIT_MESSAGE="${commit_prefix}${commit_desc}"
        print_color "$GREEN" "已提交更改"
        
        # 显示提交信息
        print_color "$BLUE" "提交详情："
        git show --stat HEAD
        
        # 先拉取远程更新
        handle_remote_updates
        
        # 自动推送到远程
        print_color "$BLUE" "正在推送到远程仓库..."
        if git push origin "$(git rev-parse --abbrev-ref HEAD)"; then
            print_color "$GREEN" "成功推送到远程仓库"
            exit 0
        else
            print_color "$RED" "推送失败，请检查远程仓库状态"
            exit 1
        fi
    fi
}

# 检查是否在git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_color "$RED" "错误: 当前目录不是git仓库"
    exit 1
fi

# 获取当前分支
current_branch=$(git rev-parse --abbrev-ref HEAD)

# 检查远程仓库更新
print_color "$BLUE" "正在检查远程仓库更新..."
git fetch origin

# 检查本地和远程是否分叉
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ $LOCAL = $REMOTE ]; then
    print_color "$GREEN" "本地仓库已是最新"
    show_main_menu
elif [ $LOCAL = $BASE ]; then
    print_color "$YELLOW" "检测到远程仓库有更新"
    
    # 检查是否有未暂存的更改
    if [[ -n $(git status -s) ]]; then
        print_color "$YELLOW" "检测到未暂存的更改，将自动处理..."
        handle_unstaged_changes
    else
        print_color "$BLUE" "正在拉取远程更新..."
        git pull --rebase
        print_color "$GREEN" "成功更新本地仓库"
    fi
    
    show_main_menu
elif [ $REMOTE = $BASE ]; then
    print_color "$YELLOW" "本地有新的提交，需要推送到远程"
    if git push origin "$current_branch"; then
        print_color "$GREEN" "成功推送到远程仓库"
    else
        print_color "$RED" "推送失败，请检查远程仓库状态"
        exit 1
    fi
else
    check_remote_updates
fi
