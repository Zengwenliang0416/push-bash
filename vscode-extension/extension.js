const vscode = require('vscode');
const { spawn } = require('child_process');
const { promisify } = require('util');

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

// 使用 Promise 封装 spawn
function spawnAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, options);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Command failed with code ${code}\n${stderr}`));
            }
        });

        process.on('error', reject);
    });
}

async function getChangedFiles(workspaceRoot) {
    const { stdout } = await spawnAsync('git', ['status', '--porcelain'], { cwd: workspaceRoot });
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
            await spawnAsync('git', ['add', file], { cwd: workspaceRoot });
        }
    } catch (error) {
        throw new Error(`添加文件失败: ${error.message}`);
    }
}

async function gitCommit(message, workspaceRoot) {
    try {
        await spawnAsync('git', ['commit', '-m', message], { cwd: workspaceRoot });
    } catch (error) {
        throw new Error(`提交失败: ${error.message}`);
    }
}

async function getProxyConfig() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    return {
        enabled: config.get('proxy.enabled', false),
        host: config.get('proxy.host', '127.0.0.1'),
        port: config.get('proxy.port', '7890')
    };
}

async function gitPush(workspaceRoot) {
    try {
        // 获取当前分支名
        const { stdout: branchName } = await spawnAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { 
            cwd: workspaceRoot,
            env: { ...process.env }
        });
        const currentBranch = branchName.trim();

        // 获取代理配置
        const proxyConfig = await getProxyConfig();
        
        // 设置环境变量
        const gitEnv = {
            ...process.env,
            GIT_TERMINAL_PROMPT: '1',
            GIT_TRACE: '2',
            GIT_CURL_VERBOSE: '1',
            GIT_TRACE_PACKET: '1'
        };

        // 如果启用了代理，添加代理设置
        if (proxyConfig.enabled) {
            const proxyUrl = `http://${proxyConfig.host}:${proxyConfig.port}`;
            gitEnv.HTTPS_PROXY = proxyUrl;
            gitEnv.HTTP_PROXY = proxyUrl;
            console.log('使用代理:', proxyUrl);
        }

        // 先测试连接
        try {
            await spawnAsync('git', ['ls-remote', '--exit-code', 'origin'], {
                cwd: workspaceRoot,
                env: gitEnv
            });
        } catch (error) {
            console.error('Remote connection test failed:', error);
            throw new Error(`无法连接到远程仓库: ${error.message}`);
        }

        // 执行push操作
        const { stdout, stderr } = await spawnAsync('git', ['push', '-v', '-u', 'origin', currentBranch], {
            cwd: workspaceRoot,
            env: gitEnv,
            timeout: 30000 // 30秒超时
        });

        console.log('Push stdout:', stdout);
        if (stderr) console.log('Push stderr:', stderr);

        return stdout;
    } catch (error) {
        console.error('Push error:', error);
        if (error.message.includes("Couldn't connect to server")) {
            throw new Error('连接GitHub服务器失败，请检查网络连接或代理设置');
        } else if (error.message.includes('Authentication failed')) {
            throw new Error('认证失败，请检查Git凭据设置');
        } else {
            throw error;
        }
    }
}

// 设置代理配置
async function setProxyConfig() {
    try {
        // 获取当前配置
        const currentConfig = await getProxyConfig();
        
        // 询问是否启用代理
        const enableProxy = await vscode.window.showQuickPick(['是', '否'], {
            placeHolder: '是否启用代理？',
            title: '代理设置'
        });
        
        if (!enableProxy) {
            return; // 用户取消
        }

        const enabled = enableProxy === '是';
        let host = currentConfig.host;
        let port = currentConfig.port;

        if (enabled) {
            // 获取代理主机地址
            host = await vscode.window.showInputBox({
                value: currentConfig.host,
                placeHolder: '请输入代理服务器地址',
                prompt: '例如: 127.0.0.1',
                title: '代理主机设置'
            });

            if (!host) {
                return; // 用户取消
            }

            // 获取代理端口
            port = await vscode.window.showInputBox({
                value: currentConfig.port,
                placeHolder: '请输入代理服务器端口',
                prompt: '例如: 7890',
                title: '代理端口设置'
            });

            if (!port) {
                return; // 用户取消
            }
        }

        // 保存配置
        const config = vscode.workspace.getConfiguration('gitCommit');
        await config.update('proxy.enabled', enabled, true);
        if (enabled) {
            await config.update('proxy.host', host, true);
            await config.update('proxy.port', port, true);
        }

        vscode.window.showInformationMessage(`代理设置${enabled ? '已启用' : '已禁用'}`);
    } catch (error) {
        console.error('设置代理失败:', error);
        vscode.window.showErrorMessage('设置代理失败: ' + error.message);
    }
}

async function activate(context) {
    console.log('扩展已激活');

    // 注册提交命令
    let commitDisposable = vscode.commands.registerCommand('git-commit-helper.commit', async () => {
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

                // 使用简单的确认对话框
                const result = await vscode.window.showInformationMessage(
                    '提交成功！是否推送到远程仓库？',
                    { modal: true },
                    '是',
                    '否'
                );

                if (result === '是') {
                    console.log('用户选择推送到远程');
                    try {
                        // 显示进度提示
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: "正在推送到远程仓库...",
                            cancellable: false
                        }, async () => {
                            console.log('开始推送...');
                            const pushOutput = await gitPush(workspaceRoot);
                            console.log('推送输出:', pushOutput.stdout);
                            vscode.window.showInformationMessage('推送成功！');
                        });
                    } catch (error) {
                        console.error('推送失败:', error);
                        // 显示更详细的错误信息
                        const errorMessage = error.message || '未知错误';
                        vscode.window.showErrorMessage(`推送失败: ${errorMessage}`);
                    }
                } else {
                    console.log('用户选择不推送');
                    vscode.window.showInformationMessage('提交成功！(未推送到远程)');
                }
            } catch (error) {
                console.error('Git操作错误:', error);
                vscode.window.showErrorMessage(`Git操作失败: ${error.message}`);
            }
        } catch (error) {
            console.error('命令执行错误:', error);
            vscode.window.showErrorMessage(`错误: ${error.message}`);
        }
    });

    // 注册设置代理命令
    let proxyDisposable = vscode.commands.registerCommand('git-commit-helper.setProxy', setProxyConfig);

    context.subscriptions.push(commitDisposable, proxyDisposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
