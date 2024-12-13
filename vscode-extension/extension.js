const vscode = require('vscode');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 提交类型定义
const COMMIT_TYPES = [
    { label: 'feat: ✨ 新功能', value: 'feat', icon: '✨' },
    { label: 'fix: 🐛 修复bug', value: 'fix', icon: '🐛' },
    { label: 'docs: 📝 文档更新', value: 'docs', icon: '📝' },
    { label: 'style: 💄 代码格式', value: 'style', icon: '💄' },
    { label: 'refactor: ♻️ 代码重构', value: 'refactor', icon: '♻️' },
    { label: 'perf: ⚡️ 性能优化', value: 'perf', icon: '⚡️' },
    { label: 'test: ✅ 测试相关', value: 'test', icon: '✅' },
    { label: 'build: 📦️ 构建相关', value: 'build', icon: '📦️' },
    { label: 'ci: 👷 CI/CD相关', value: 'ci', icon: '👷' },
    { label: 'chore: 🔨 其他更改', value: 'chore', icon: '🔨' },
    { label: 'init: 🎉 初始化', value: 'init', icon: '🎉' },
    { label: 'security: 🔒 安全更新', value: 'security', icon: '🔒' },
    { label: 'deps: 📌 依赖更新', value: 'deps', icon: '📌' },
    { label: 'i18n: 🌐 国际化', value: 'i18n', icon: '🌐' },
    { label: 'typo: ✍️ 拼写修正', value: 'typo', icon: '✍️' },
    { label: 'revert: ⏪️ 回退更改', value: 'revert', icon: '⏪️' },
    { label: 'merge: 🔀 合并分支', value: 'merge', icon: '🔀' },
    { label: 'release: 🏷️ 发布版本', value: 'release', icon: '🏷️' },
    { label: 'deploy: 🚀 部署相关', value: 'deploy', icon: '🚀' },
    { label: 'ui: 🎨 界面相关', value: 'ui', icon: '🎨' }
];

async function getChangedFiles(workspaceRoot) {
    const { stdout } = await execAsync('git status --porcelain', { cwd: workspaceRoot });
    return stdout.split('\n')
        .filter(line => line.trim())
        .map(line => ({
            status: line.substring(0, 2).trim(),
            path: line.substring(3)
        }));
}

async function selectFiles(changedFiles) {
    const items = changedFiles.map(file => ({
        label: file.path,
        description: file.status,
        picked: true // 默认全选
    }));

    const selectedItems = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: '选择要提交的文件（可多选）'
    });

    return selectedItems ? selectedItems.map(item => item.label) : null;
}

async function selectCommitType() {
    const selected = await vscode.window.showQuickPick(COMMIT_TYPES, {
        placeHolder: '选择提交类型'
    });

    return selected ? selected : null;
}

async function getCommitMessage(type) {
    const message = await vscode.window.showInputBox({
        placeHolder: '输入提交描述',
        prompt: '请输入提交描述（不包含类型和表情）'
    });

    return message ? `${type.value}: ${type.icon} ${message}` : null;
}

async function gitAdd(files, workspaceRoot) {
    try {
        for (const file of files) {
            const { stdout, stderr } = await execAsync(`git add "${file}"`, { cwd: workspaceRoot });
            if (stderr) {
                throw new Error(`添加文件失败: ${stderr}`);
            }
        }
    } catch (error) {
        throw new Error(`git add 失败: ${error.message}`);
    }
}

async function gitCommit(message, workspaceRoot) {
    try {
        const { stdout, stderr } = await execAsync(`git commit -m "${message}"`, { cwd: workspaceRoot });
        if (stderr) {
            throw new Error(`提交失败: ${stderr}`);
        }
        return stdout;
    } catch (error) {
        throw new Error(`git commit 失败: ${error.message}`);
    }
}

async function gitPush(workspaceRoot) {
    try {
        console.log('正在获取分支名...');
        // 获取当前分支名
        const { stdout: branchName, stderr: branchErr } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot });
        if (branchErr) {
            console.error('获取分支名错误:', branchErr);
            throw new Error(`获取分支名失败: ${branchErr}`);
        }
        const currentBranch = branchName.trim();
        console.log('当前分支:', currentBranch);
        
        // 执行push操作
        console.log('开始执行push操作...');
        const { stdout, stderr } = await execAsync(`git push origin ${currentBranch}`, { 
            cwd: workspaceRoot,
            // 添加环境变量以显示更多信息
            env: { ...process.env, GIT_TRACE: '1' }
        });
        
        if (stderr) {
            console.error('推送stderr:', stderr);
            // git push 可能会在stderr中输出进度信息，所以不一定是错误
            if (stderr.includes('error:')) {
                throw new Error(`推送失败: ${stderr}`);
            }
        }
        
        console.log('推送stdout:', stdout);
        return stdout;
    } catch (error) {
        console.error('Push操作错误:', error);
        throw new Error(`git push 失败: ${error.message}`);
    }
}

async function activate(context) {
    console.log('扩展已激活');
    let disposable = vscode.commands.registerCommand('git-commit-helper.commit', async () => {
        try {
            console.log('命令开始执行');
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('请先打开一个工作区');
                return;
            }

            // 获取更改的文件
            console.log('获取更改的文件...');
            const changedFiles = await getChangedFiles(workspaceRoot);
            if (!changedFiles.length) {
                vscode.window.showWarningMessage('没有发现需要提交的更改');
                return;
            }

            // 选择文件
            console.log('等待用户选择文件...');
            const selectedFiles = await selectFiles(changedFiles);
            if (!selectedFiles || selectedFiles.length === 0) {
                vscode.window.showWarningMessage('未选择任何文件');
                return;
            }

            // 选择提交类型
            console.log('等待用户选择提交类型...');
            const commitType = await selectCommitType();
            if (!commitType) {
                vscode.window.showWarningMessage('未选择提交类型');
                return;
            }

            // 获取提交信息
            console.log('等待用户输入提交信息...');
            const commitMessage = await getCommitMessage(commitType);
            if (!commitMessage) {
                vscode.window.showWarningMessage('未输入提交信息');
                return;
            }

  
            // 执行git操作
            try {
                console.log('开始git操作...');
                await gitAdd(selectedFiles, workspaceRoot);
                console.log('git add完成');
                await gitCommit(commitMessage, workspaceRoot);
                console.log('git commit完成');

                // 使用showWarningMessage来确保对话框显示
                const choice = await vscode.window.showWarningMessage(
                    '提交成功！是否要推送到远程仓库？',
                    { modal: true },
                    '是',
                    '否'
                );

                console.log('用户的选择:', choice);

                if (choice === '是') {
                    console.log('用户选择推送到远程');
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: "正在推送到远程仓库...",
                        cancellable: false
                    }, async (progress) => {
                        try {
                            console.log('开始推送...');
                            const result = await gitPush(workspaceRoot);
                            console.log('推送结果:', result);
                            await vscode.window.showInformationMessage('推送成功！');
                        } catch (error) {
                            console.error('推送错误:', error);
                            await vscode.window.showErrorMessage(`推送失败: ${error.message}`);
                            throw error;
                        }
                    });
                } else {
                    console.log('用户选择不推送或关闭对话框');
                    await vscode.window.showInformationMessage('提交成功！(未推送到远程)');
                }
            } catch (error) {
                console.error('Git操作错误:', error);
                await vscode.window.showErrorMessage(`Git操作失败: ${error.message}`);
                throw error;
            }
        } catch (error) {
            console.error('命令执行错误:', error);
            vscode.window.showErrorMessage(`错误: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
