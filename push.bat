@echo off
setlocal EnableDelayedExpansion

:: 设置代码页为UTF-8
chcp 65001 > nul

:: 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: 定义打印彩色文本的函数
call :create_print_color_function
goto :main

:print_color
set "color=%~1"
set "message=%~2"
echo %color%%message%%NC%
exit /b

:create_print_color_function
:: 使用PowerShell创建一个更可靠的彩色输出函数
powershell -Command ^
    "$function:print_color = {" ^
    "    param([string]$color, [string]$message)" ^
    "    Write-Host $message -ForegroundColor $color" ^
    "}" ^
    "Set-Item -Path Function:\Global:print_color -Value $function:print_color"
exit /b

:main
:: 检查是否在git仓库中
git rev-parse --git-dir > nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "print_color 'Red' '错误: 当前目录不是git仓库'"
    exit /b 1
)

:: 记录操作状态的变量
set "STATUS_FILES_ADDED=false"
set "STATUS_CHANGES_COMMITTED=false"
set "STATUS_COMMIT_HASH="
set "STATUS_BRANCH="
set "STATUS_COMMIT_MESSAGE="

:menu
powershell -Command "print_color 'Blue' '=== Git 操作菜单 ==='"
powershell -Command "print_color 'White' '1. 提交更改'"
powershell -Command "print_color 'White' '2. 查看提交历史'"
powershell -Command "print_color 'White' '3. 搜索提交'"
powershell -Command "print_color 'White' '4. 查看提交详情'"
powershell -Command "print_color 'White' '5. 撤销提交'"
powershell -Command "print_color 'White' '6. 退出'"

set /p choice="请选择操作 (1-6): "

if "%choice%"=="1" (
    call :commit_changes
) else if "%choice%"=="2" (
    git log --oneline -n 10
    pause
    goto :menu
) else if "%choice%"=="3" (
    set /p search_term="请输入搜索关键词: "
    git log --all --grep="%search_term%" --oneline
    pause
    goto :menu
) else if "%choice%"=="4" (
    set /p commit_hash="请输入提交哈希: "
    if not "!commit_hash!"=="" (
        git show !commit_hash!
    ) else (
        powershell -Command "print_color 'Red' '错误: 提交哈希不能为空'"
    )
    pause
    goto :menu
) else if "%choice%"=="5" (
    set /p commit_hash="请输入要撤销的提交哈希: "
    if not "!commit_hash!"=="" (
        powershell -Command "print_color 'Yellow' '即将撤销以下提交:'"
        git show --oneline --no-patch !commit_hash!
        set /p confirm="确认撤销? (y/n): "
        if /i "!confirm!"=="y" (
            git revert !commit_hash!
            powershell -Command "print_color 'Green' '已成功撤销提交'"
        ) else (
            powershell -Command "print_color 'White' '操作已取消'"
        )
    ) else (
        powershell -Command "print_color 'Red' '错误: 提交哈希不能为空'"
    )
    pause
    goto :menu
) else if "%choice%"=="6" (
    powershell -Command "print_color 'White' '退出程序'"
    exit /b 0
) else (
    powershell -Command "print_color 'Red' '无效的选择'"
    goto :menu
)

:commit_changes
:: 检查是否有未提交的更改
git status --porcelain > "%TEMP%\git_status.txt"
for %%I in ("%TEMP%\git_status.txt") do set size=%%~zI
if %size% equ 0 (
    powershell -Command "print_color 'Yellow' '没有发现需要提交的更改'"
    set /p continue="是否继续? (y/n): "
    if /i not "!continue!"=="y" (
        powershell -Command "print_color 'White' '操作已取消'"
        exit /b 0
    )
)

:: 显示当前Git状态
powershell -Command "print_color 'White' '当前Git状态:'"
git status -s

:: 选择提交方式
powershell -Command "print_color 'Yellow' '请选择提交方式:'"
powershell -Command "print_color 'White' '1. 提交所有更改 (git add .)'"
powershell -Command "print_color 'White' '2. 交互式选择文件 (git add -p)'"
powershell -Command "print_color 'White' '3. 选择已更改的文件'"

set /p choice="请选择 (1-3): "

if "%choice%"=="1" (
    git add .
    set "STATUS_FILES_ADDED=true"
) else if "%choice%"=="2" (
    git add -p
    set "STATUS_FILES_ADDED=true"
) else if "%choice%"=="3" (
    :: 获取已更改的文件列表
    git status --porcelain > "%TEMP%\changed_files.txt"
    
    :: 检查是否有更改的文件
    for %%I in ("%TEMP%\changed_files.txt") do set size=%%~zI
    if !size! equ 0 (
        powershell -Command "print_color 'Red' '没有发现已更改的文件'"
        del "%TEMP%\changed_files.txt"
        exit /b 1
    )

    :: 显示文件列表
    powershell -Command "print_color 'Yellow' '已更改的文件列表:'"
    set "file_num=0"
    for /f "tokens=2 delims= " %%a in ('type "%TEMP%\changed_files.txt"') do (
        set /a "file_num+=1"
        set "file_!file_num!=%%a"
        powershell -Command "print_color 'White' '!file_num!. %%a'"
    )

    powershell -Command "print_color 'Yellow' '请输入要添加的文件编号（多个文件用空格分隔，输入 a 选择全部）:'"
    set /p selections="选择: "

    if /i "!selections!"=="a" (
        for /f "tokens=2 delims= " %%a in ('type "%TEMP%\changed_files.txt"') do (
            git add "%%a" 2>nul
            if errorlevel 1 (
                powershell -Command "print_color 'Red' '添加失败: %%a'"
                del "%TEMP%\changed_files.txt"
                exit /b 1
            ) else (
                powershell -Command "print_color 'Green' '成功添加: %%a'"
            )
        )
    ) else (
        for %%i in (!selections!) do (
            set "current_file=!file_%%i!"
            if defined current_file (
                git add "!current_file!" 2>nul
                if errorlevel 1 (
                    powershell -Command "print_color 'Red' '添加失败: !current_file!'"
                    del "%TEMP%\changed_files.txt"
                    exit /b 1
                ) else (
                    powershell -Command "print_color 'Green' '成功添加: !current_file!'"
                )
            ) else (
                powershell -Command "print_color 'Red' '无效的选择: %%i'"
                del "%TEMP%\changed_files.txt"
                exit /b 1
            )
        )
    )
    del "%TEMP%\changed_files.txt"
    set "STATUS_FILES_ADDED=true"
) else (
    powershell -Command "print_color 'Red' '错误: 无效的选择'"
    exit /b 1
)

:: 显示已暂存的更改
powershell -Command "print_color 'Yellow' '已暂存的更改:'"
git status -s

:: 选择提交信息类型
powershell -Command "print_color 'Yellow' '请选择提交类型:'"
set "commit_types[1]=feat: ✨ 新功能"
set "commit_types[2]=fix: 🐛 修复bug"
set "commit_types[3]=docs: 📝 文档更改"
set "commit_types[4]=style: 💄 代码格式"
set "commit_types[5]=refactor: ♻️ 代码重构"
set "commit_types[6]=test: ✅ 测试相关"
set "commit_types[7]=chore: 🔧 构建相关"
set "commit_types[8]=perf: ⚡️ 性能优化"
set "commit_types[9]=ci: 👷 CI相关"
set "commit_types[10]=revert: ⏪️ 回退更改"
set "commit_types[11]=build: 📦️ 打包相关"
set "commit_types[12]=custom: 自定义"

for /l %%i in (1,1,12) do (
    powershell -Command "print_color 'White' '%%i. !commit_types[%%i]!'"
)

set /p type_choice="请选择 (1-12): "
set "selected_type=!commit_types[%type_choice%]!"

if "!selected_type!"=="" (
    powershell -Command "print_color 'Red' '错误: 无效的选择'"
    exit /b 1
)

:: 获取提交描述
set /p commit_desc="请输入提交描述: "
if "!commit_desc!"=="" (
    powershell -Command "print_color 'Red' '提交描述不能为空'"
    exit /b 1
)

:: 构建提交信息
set "message=!selected_type! !commit_desc!"

:: 获取当前分支
for /f "tokens=* USEBACKQ" %%F in (`git rev-parse --abbrev-ref HEAD`) do set "branch=%%F"
set "STATUS_BRANCH=!branch!"

powershell -Command "print_color 'Yellow' '即将执行以下操作:'"
powershell -Command "print_color 'White' '1. git commit -m ""!message!""'"
powershell -Command "print_color 'White' '2. git push origin !branch!'"

set /p confirm="确认执行? (y/n): "
if /i not "!confirm!"=="y" (
    powershell -Command "print_color 'White' '操作已取消'"
    exit /b 0
)

:: 执行Git操作
powershell -Command "print_color 'Yellow' '正在执行git操作...'"

powershell -Command "print_color 'Yellow' '1. 提交更改...'"
git commit -m "!message!"
set "STATUS_CHANGES_COMMITTED=true"
for /f "tokens=* USEBACKQ" %%F in (`git rev-parse HEAD`) do set "STATUS_COMMIT_HASH=%%F"
set "STATUS_COMMIT_MESSAGE=!message!"

powershell -Command "print_color 'Yellow' '2. 推送到远程...'"
git push origin "!branch!"
if errorlevel 1 (
    powershell -Command "print_color 'Red' '推送失败，请检查网络连接或远程仓库状态'"
    call :show_status_and_recovery
    exit /b 1
) else (
    powershell -Command "print_color 'Green' '所有操作已成功完成！'"
)

goto :menu

:show_status_and_recovery
powershell -Command "print_color 'Blue' '=== 操作状态 ==='"
powershell -Command "print_color 'White' '1. 文件暂存: !STATUS_FILES_ADDED!'"
powershell -Command "print_color 'White' '2. 更改提交: !STATUS_CHANGES_COMMITTED!'"
if not "!STATUS_COMMIT_HASH!"=="" (
    powershell -Command "print_color 'White' '3. 提交哈希: !STATUS_COMMIT_HASH!'"
)
powershell -Command "print_color 'White' '4. 目标分支: !STATUS_BRANCH!'"
powershell -Command "print_color 'White' '5. 提交信息: !STATUS_COMMIT_MESSAGE!'"

powershell -Command "print_color 'Blue' '=== 恢复建议 ==='"
if "!STATUS_CHANGES_COMMITTED!"=="true" (
    powershell -Command "print_color 'White' '您的更改已经提交到本地仓库。要重新推送，请执行:'"
    powershell -Command "print_color 'White' 'git push origin !STATUS_BRANCH!'"
    powershell -Command "print_color 'White' '如果想要撤销提交，请执行:'"
    powershell -Command "print_color 'White' 'git reset --soft HEAD^'"
) else if "!STATUS_FILES_ADDED!"=="true" (
    powershell -Command "print_color 'White' '文件已暂存但未提交。要继续，请执行:'"
    powershell -Command "print_color 'White' 'git commit -m ""!STATUS_COMMIT_MESSAGE!""'"
    powershell -Command "print_color 'White' 'git push origin !STATUS_BRANCH!'"
    powershell -Command "print_color 'White' '如果想要撤销暂存，请执行:'"
    powershell -Command "print_color 'White' 'git reset'"
)
exit /b

:end
endlocal
