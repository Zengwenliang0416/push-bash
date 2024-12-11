@echo off
setlocal EnableDelayedExpansion

:: 设置代码页为UTF-8
chcp 65001 >nul

:: 设置git不对中文文件名转义
git config --global core.quotepath false

:: 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: 记录操作状态的变量
set "STATUS_FILES_ADDED=false"
set "STATUS_CHANGES_COMMITTED=false"
set "STATUS_COMMIT_HASH="
set "STATUS_BRANCH="
set "STATUS_COMMIT_MESSAGE="

:: 提交历史管理函数
:show_commit_history
    set "num_commits=%~1"
    set "search_term=%~2"
    if "%num_commits%"=="" set "num_commits=10"

    if "%search_term%"=="" (
        git log -n %num_commits% --pretty=format:"%%C(yellow)%%h%%Creset -%%C(bold green)%%d%%Creset %%s %%C(dim)(%%cr) %%C(bold blue)^<%%an^>%%Creset"
    ) else (
        git log -n %num_commits% --pretty=format:"%%C(yellow)%%h%%Creset -%%C(bold green)%%d%%Creset %%s %%C(dim)(%%cr) %%C(bold blue)^<%%an^>%%Creset" --grep="%search_term%"
    )
    exit /b

:show_commit_details
    set "commit_hash=%~1"
    if "%commit_hash%"=="" (
        echo %RED%错误: 未指定提交哈希%NC%
        exit /b 1
    )

    echo.
    echo %BLUE%=== 提交详情 ===%NC%
    git show --color --pretty=fuller %commit_hash%
    exit /b

:revert_commit
    set "commit_hash=%~1"
    if "%commit_hash%"=="" (
        echo %RED%错误: 未指定提交哈希%NC%
        exit /b 1
    )

    echo.
    echo %YELLOW%即将撤销以下提交:%NC%
    git show --oneline --no-patch %commit_hash%
    
    powershell -Command "$confirm = Read-Host '确认撤销? (y/n)'; $confirm" > "%TEMP%\confirm.txt"
    set /p confirm=<"%TEMP%\confirm.txt"
    del "%TEMP%\confirm.txt"

    if /i "%confirm%"=="y" (
        git revert %commit_hash%
        echo %GREEN%已成功撤销提交%NC%
    ) else (
        echo 操作已取消
    )
    exit /b

:show_main_menu
    :menu_loop
    echo.
    echo %BLUE%=== Git 操作菜单 ===%NC%
    echo 1. 提交更改
    echo 2. 查看提交历史
    echo 3. 搜索提交
    echo 4. 查看提交详情
    echo 5. 撤销提交
    echo 6. 退出

    powershell -Command "$choice = Read-Host '请选择操作 (1-6)'; $choice" > "%TEMP%\choice.txt"
    set /p choice=<"%TEMP%\choice.txt"
    del "%TEMP%\choice.txt"

    if "%choice%"=="1" (
        call :commit_changes
    ) else if "%choice%"=="2" (
        powershell -Command "$num = Read-Host '查看最近几条记录 (默认10)'; $num" > "%TEMP%\num.txt"
        set /p num_commits=<"%TEMP%\num.txt"
        del "%TEMP%\num.txt"
        if "!num_commits!"=="" set "num_commits=10"
        call :show_commit_history !num_commits!
    ) else if "%choice%"=="3" (
        powershell -Command "$term = Read-Host '请输入搜索关键词'; $term" > "%TEMP%\term.txt"
        set /p search_term=<"%TEMP%\term.txt"
        del "%TEMP%\term.txt"
        if not "!search_term!"=="" call :show_commit_history 50 "!search_term!"
    ) else if "%choice%"=="4" (
        powershell -Command "$hash = Read-Host '请输入提交哈希'; $hash" > "%TEMP%\hash.txt"
        set /p commit_hash=<"%TEMP%\hash.txt"
        del "%TEMP%\hash.txt"
        if not "!commit_hash!"=="" call :show_commit_details "!commit_hash!"
    ) else if "%choice%"=="5" (
        powershell -Command "$hash = Read-Host '请输入要撤销的提交哈希'; $hash" > "%TEMP%\hash.txt"
        set /p commit_hash=<"%TEMP%\hash.txt"
        del "%TEMP%\hash.txt"
        if not "!commit_hash!"=="" call :revert_commit "!commit_hash!"
    ) else if "%choice%"=="6" (
        echo 退出程序
        exit /b
    ) else (
        echo %RED%无效的选择%NC%
    )
    goto :menu_loop

:commit_changes
    :: 定义提交类型数组
    set "type[1]=feat: ✨ 新功能"
    set "type[2]=fix: 🐛 修复bug"
    set "type[3]=docs: 📝 文档更新"
    set "type[4]=style: 💄 代码格式"
    set "type[5]=refactor: ♻️ 代码重构"
    set "type[6]=perf: ⚡️ 性能优化"
    set "type[7]=test: ✅ 测试相关"
    set "type[8]=build: 📦️ 构建相关"
    set "type[9]=ci: 👷 CI/CD相关"
    set "type[10]=chore: 🔨 其他更改"
    set "type[11]=init: 🎉 初始化"
    set "type[12]=security: 🔒 安全更新"
    set "type[13]=deps: 📌 依赖更新"
    set "type[14]=i18n: 🌐 国际化"
    set "type[15]=typo: ✍️ 拼写修正"
    set "type[16]=revert: ⏪️ 回退更改"
    set "type[17]=merge: 🔀 合并分支"
    set "type[18]=release: 🏷️ 发布版本"
    set "type[19]=deploy: 🚀 部署相关"
    set "type[20]=ui: 🎨 界面相关"
    set "type[21]=custom: 🎯 自定义格式"

    :: 定义表情数组
    set "emoji[1]=🎨 - 改进代码结构/格式"
    set "emoji[2]=⚡️ - 提升性能"
    set "emoji[3]=🔥 - 删除代码/文件"
    set "emoji[4]=🐛 - 修复 bug"
    set "emoji[5]=🚑️ - 重要补丁"
    set "emoji[6]=✨ - 引入新功能"
    set "emoji[7]=📝 - 撰写文档"
    set "emoji[8]=🚀 - 部署功能"
    set "emoji[9]=💄 - UI/样式更新"
    set "emoji[10]=🎉 - 初次提交"
    set "emoji[11]=✅ - 增加测试"
    set "emoji[12]=🔒️ - 修复安全问题"
    set "emoji[13]=🔐 - 添加或更新密钥"
    set "emoji[14]=🔖 - 发布/版本标签"
    set "emoji[15]=🚨 - 修复编译器/linter警告"
    set "emoji[16]=🚧 - 工作进行中"
    set "emoji[17]=💚 - 修复CI构建问题"
    set "emoji[18]=⬇️ - 降级依赖"
    set "emoji[19]=⬆️ - 升级依赖"
    set "emoji[20]=📌 - 固定依赖版本"
    set "emoji[21]=👷 - 添加CI构建系统"
    set "emoji[22]=📈 - 添加分析或跟踪代码"
    set "emoji[23]=♻️ - 重构代码"
    set "emoji[24]=➕ - 添加依赖"
    set "emoji[25]=➖ - 删除依赖"
    set "emoji[26]=🔧 - 修改配置文件"
    set "emoji[27]=🔨 - 重大重构"
    set "emoji[28]=🌐 - 国际化与本地化"
    set "emoji[29]=✏️ - 修复拼写错误"
    set "emoji[30]=💩 - 需要改进的代码"
    set "emoji[31]=⏪️ - 回退更改"
    set "emoji[32]=🔀 - 合并分支"
    set "emoji[33]=📦️ - 更新编译文件"
    set "emoji[34]=👽️ - 更新外部API"
    set "emoji[35]=🚚 - 移动/重命名文件"
    set "emoji[36]=📄 - 添加许可证"
    set "emoji[37]=💥 - 重大更改"
    set "emoji[38]=🍱 - 添加资源"
    set "emoji[39]=♿️ - 提高可访问性"
    set "emoji[40]=🔊 - 添加日志"
    set "emoji[41]=🔇 - 删除日志"

    :: 显示操作状态和恢复建议
    :show_status_and_recovery
    echo.
    echo %BLUE%=== 操作状态 ===%NC%
    echo 1. 文件暂存: %STATUS_FILES_ADDED%
    echo 2. 更改提交: %STATUS_CHANGES_COMMITTED%
    if not "%STATUS_COMMIT_HASH%"=="" (
        echo 3. 提交哈希: %STATUS_COMMIT_HASH%
    )
    echo 4. 目标分支: %STATUS_BRANCH%
    echo 5. 提交信息: %STATUS_COMMIT_MESSAGE%

    echo.
    echo %BLUE%=== 恢复建议 ===%NC%
    if "%STATUS_CHANGES_COMMITTED%"=="true" (
        echo 您的更改已经提交到本地仓库。要重新推送，请执行：
        echo git push origin %STATUS_BRANCH%
        echo.
        echo 如果想要撤销提交，请执行：
        echo git reset --soft HEAD^
    ) else if "%STATUS_FILES_ADDED%"=="true" (
        echo 文件已暂存但未提交。要继续，请执行：
        echo git commit -m "%STATUS_COMMIT_MESSAGE%"
        echo git push origin %STATUS_BRANCH%
        echo.
        echo 如果想要撤销暂存，请执行：
        echo git reset
    )
    goto :eof

    :: 检查是否在git仓库中
    git rev-parse --git-dir >nul 2>&1
    if errorlevel 1 (
        echo %RED%错误：当前目录不是git仓库%NC%
        exit /b 1
    )

    :: 获取当前分支
    for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set "current_branch=%%i"

    :: 显示当前Git状态
    echo 当前Git状态:
    git status -s -uno > "%TEMP%\gitstatus.tmp"
    for /f "usebackq tokens=1,* delims= " %%a in ("%TEMP%\gitstatus.tmp") do (
        echo %%a %%b
    )
    del "%TEMP%\gitstatus.tmp"

    :: 检查是否有未提交的更改
    git status --porcelain > "%TEMP%\status.txt"
    for /f %%i in ("%TEMP%\status.txt") do set size=%%~zi
    if %size% equ 0 (
        echo %YELLOW%没有发现需要提交的更改%NC%
        powershell -Command "$continue = Read-Host '是否继续? (y/n)'; $continue" > "%TEMP%\continue.txt"
        set /p continue=<"%TEMP%\continue.txt"
        del "%TEMP%\continue.txt"

        if /i "!continue!" neq "y" (
            echo 操作已取消
            exit /b 0
        )
    )
    del "%TEMP%\status.txt"

    :: 选择提交方式
    echo.
    echo %YELLOW%请选择提交方式:%NC%
    echo 1. 提交所有更改 (git add .)
    echo 2. 交互式选择文件 (git add -p)
    echo 3. 手动输入文件路径

    powershell -Command "$choice = Read-Host '请选择 (1-3)'; $choice" > "%TEMP%\choice.txt"
    set /p choice=<"%TEMP%\choice.txt"
    del "%TEMP%\choice.txt"

    if "%choice%"=="1" (
        echo.
        echo %YELLOW%添加所有文件...%NC%
        git add .
        set "STATUS_FILES_ADDED=true"
    ) else if "%choice%"=="2" (
        echo.
        echo %YELLOW%开始交互式选择...%NC%
        git add -p
        set "STATUS_FILES_ADDED=true"
    ) else if "%choice%"=="3" (
        echo.
        echo %YELLOW%请输入要添加的文件路径（多个文件用空格分隔）:%NC%
        powershell -Command "$path = Read-Host '请输入文件路径'; $path" > "%TEMP%\path.txt"
        set /p file_path=<"%TEMP%\path.txt"
        del "%TEMP%\path.txt"
        
        if not "!file_path!"=="" (
            git add "!file_path!"
            set "STATUS_FILES_ADDED=true"
        ) else (
            echo %RED%错误: 文件路径不能为空%NC%
            exit /b 1
        )
    ) else (
        echo %RED%错误: 无效的选择%NC%
        exit /b 1
    )

    :: 显示提交类型选项
    echo.
    echo %YELLOW%请选择提交类型:%NC%
    for /l %%i in (1,1,21) do echo %%i. !type[%%i]!
    powershell -Command "$type_choice = Read-Host '请选择 (1-21)'; $type_choice" > "%TEMP%\type_choice.txt"
    set /p type_choice=<"%TEMP%\type_choice.txt"
    del "%TEMP%\type_choice.txt"

    :: 验证提交类型选择
    if !type_choice! lss 1 (
        echo %RED%错误: 无效的选择%NC%
        exit /b 1
    )
    if !type_choice! gtr 21 (
        echo %RED%错误: 无效的选择%NC%
        exit /b 1
    )

    :: 获取选择的提交类型
    set "commit_prefix=!type[%type_choice%]!"

    :: 如果选择了自定义格式，让用户选择emoji
    if "!type_choice!"=="21" (
        echo.
        echo %YELLOW%请选择emoji:%NC%
        for /l %%i in (1,1,41) do echo %%i. !emoji[%%i]!
        powershell -Command "$emoji_choice = Read-Host '请选择 (1-41)'; $emoji_choice" > "%TEMP%\emoji_choice.txt"
        set /p emoji_choice=<"%TEMP%\emoji_choice.txt"
        del "%TEMP%\emoji_choice.txt"
        
        :: 验证emoji选择
        if !emoji_choice! lss 1 (
            echo %RED%错误: 无效的选择%NC%
            exit /b 1
        )
        if !emoji_choice! gtr 41 (
            echo %RED%错误: 无效的选择%NC%
            exit /b 1
        )
        
        :: 提取emoji（第一个空格前的部分）
        for /f "tokens=1 delims= " %%a in ("!emoji[%emoji_choice%]!") do set "selected_emoji=%%a"
        
        :: 获取自定义类型
        powershell -Command "$custom_type = Read-Host '请输入提交类型'; $custom_type" > "%TEMP%\custom_type.txt"
        set /p custom_type=<"%TEMP%\custom_type.txt"
        del "%TEMP%\custom_type.txt"
        set "commit_prefix=!custom_type!: !selected_emoji!"
    )

    :: 获取提交描述
    echo.
    powershell -Command "$commit_desc = Read-Host '请输入提交描述'; $commit_desc" > "%TEMP%\commit_desc.txt"
    set /p commit_desc=<"%TEMP%\commit_desc.txt"
    del "%TEMP%\commit_desc.txt"

    :: 组合完整的提交信息
    set "message=!commit_prefix! !commit_desc!"
    set "STATUS_COMMIT_MESSAGE=!message!"

    :: 获取分支名称
    powershell -Command "$branch = Read-Host '请输入分支名称 (默认是 %current_branch%)'; $branch" > "%TEMP%\branch.txt"
    set /p branch=<"%TEMP%\branch.txt"
    del "%TEMP%\branch.txt"
    if "!branch!"=="" set "branch=%current_branch%"
    set "STATUS_BRANCH=!branch!"

    echo.
    echo %YELLOW%即将执行以下操作:%NC%
    echo 1. git commit -m "!message!"
    echo 2. git push origin !branch!

    powershell -Command "$confirm = Read-Host '确认执行? (y/n)'; $confirm" > "%TEMP%\confirm.txt"
    set /p confirm=<"%TEMP%\confirm.txt"
    del "%TEMP%\confirm.txt"
    if /i "!confirm!" neq "y" (
        echo 操作已取消
        exit /b 0
    )

    :: 执行git命令
    echo.
    echo %YELLOW%正在执行git操作...%NC%

    echo.
    echo %YELLOW%1. 提交更改...%NC%
    git commit -m "!message!"
    if errorlevel 1 (
        echo %RED%提交更改失败%NC%
        call :show_status_and_recovery
        exit /b 1
    )
    set "STATUS_CHANGES_COMMITTED=true"
    for /f "tokens=*" %%i in ('git rev-parse HEAD') do set "STATUS_COMMIT_HASH=%%i"

    echo.
    echo %YELLOW%2. 推送到远程...%NC%
    git push origin "!branch!"
    if errorlevel 1 (
        echo %RED%推送失败，请检查网络连接或远程仓库状态%NC%
        call :show_status_and_recovery
        exit /b 1
    ) else (
        echo.
        echo %GREEN%所有操作已成功完成！%NC%
    )

    pause

:: 检查是否在git仓库中
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo %RED%错误：当前目录不是git仓库%NC%
    exit /b 1
)

:: 获取当前分支
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set "current_branch=%%i"

:: 显示主菜单
call :show_main_menu
