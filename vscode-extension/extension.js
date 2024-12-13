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
    for (const file of files) {
        await execAsync(`git add "${file}"`, { cwd: workspaceRoot });
    }
}

async function gitCommit(message, workspaceRoot) {
    await execAsync(`git commit -m "${message}"`, { cwd: workspaceRoot });
}

async function gitPush(workspaceRoot) {
    // 获取当前分支名
    const { stdout: branchName } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot });
    const currentBranch = branchName.trim();
    
    // 执行push操作
    await execAsync(`git push origin ${currentBranch}`, { cwd: workspaceRoot });
}

async function activate(context) {
    let disposable = vscode.commands.registerCommand('git-commit-helper.commit', async () => {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('请先打开一个工作区');
                return;
            }

            // 获取更改的文件
            const changedFiles = await getChangedFiles(workspaceRoot);
            if (!changedFiles.length) {
                vscode.window.showInformationMessage('没有发现需要提交的更改');
                return;
            }

            // 选择文件
            const selectedFiles = await selectFiles(changedFiles);
            if (!selectedFiles) {
                return;
            }

            // 选择提交类型
            const commitType = await selectCommitType();
            if (!commitType) {
                return;
            }

            // 获取提交信息
            const commitMessage = await getCommitMessage(commitType);
            if (!commitMessage) {
                return;
            }

            // 执行git操作
            await gitAdd(selectedFiles, workspaceRoot);
            await gitCommit(commitMessage, workspaceRoot);

            // 询问是否要推送到远程
            const shouldPush = await vscode.window.showQuickPick(['是', '否'], {
                placeHolder: '是否要推送到远程仓库？'
            });

            if (shouldPush === '是') {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "正在推送到远程仓库...",
                    cancellable: false
                }, async () => {
                    try {
                        await gitPush(workspaceRoot);
                        vscode.window.showInformationMessage('推送成˛功！');
                    } catch (error) {
                        vscode.window.showErrorMessage(`推送失败: ${error.message}`);
                    }
                });
            } else {
                vscode.window.showInformationMessage('提交成功！(未推送到远程)');
            }
        } catch (error) {
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
