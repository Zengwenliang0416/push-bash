const vscode = require('vscode');
const { spawn } = require('child_process');
const { promisify } = require('util');

// 国际化文本
const i18n = {
    'zh-cn': {
        // 提交类型
        commitTypes: [
            { label: 'feat: ✨ 新功能', value: 'feat', icon: '✨' },
            { label: 'fix: 🐛 修复', value: 'fix', icon: '🐛' },
            { label: 'docs: 📝 文档', value: 'docs', icon: '📝' },
            { label: 'style: 💄 格式', value: 'style', icon: '💄' },
            { label: 'refactor: ♻️ 重构', value: 'refactor', icon: '♻️' },
            { label: 'perf: ⚡️ 性能', value: 'perf', icon: '⚡️' },
            { label: 'test: ✅ 测试', value: 'test', icon: '✅' },
            { label: 'chore: 🔧 工具', value: 'chore', icon: '🔧' },
            { label: 'revert: ⏪️ 回退', value: 'revert', icon: '⏪️' },
            { label: 'build: 📦️ 打包', value: 'build', icon: '📦️' },
            { label: 'ci: 👷 集成', value: 'ci', icon: '👷' },
            { label: 'ui: 🎨 界面相关', value: 'ui', icon: '🎨' }
        ],
        // 提示信息
        messages: {
            noWorkspace: '请先打开一个工作区',
            noChanges: '没有需要提交的更改',
            hasUnpushedCommits: '没有需要提交的更改，但发现有未推送的提交。是否要推送到远程？',
            selectFiles: '选择要提交的文件',
            selectCommitType: '选择提交类型',
            enterCommitMessage: '输入提交信息',
            commitSuccess: '提交成功！',
            pushSuccess: '推送成功！',
            pushFailed: '推送失败',
            commitFailed: '提交失败',
            pushQuestion: '是否推送到远程仓库？',
            yes: '是',
            no: '否',
            pushing: '正在推送到远程仓库...',
            networkError: '连接GitHub服务器失败，请检查网络连接或代理设置',
            authError: '认证失败，请检查Git凭据设置',
            // 代理设置
            proxyTitle: '代理设置',
            enableProxy: '是否启用代理？',
            proxyHost: '请输入代理服务器地址',
            proxyPort: '请输入代理服务器端口',
            proxyEnabled: '代理已启用',
            proxyDisabled: '代理已禁用',
            proxyError: '设置代理失败',
            config: {
                language: {
                    description: '语言设置'
                },
                proxy: {
                    enabled: {
                        description: '是否启用代理'
                    },
                    host: {
                        description: '代理服务器地址'
                    },
                    port: {
                        description: '代理服务器端口'
                    }
                }
            }
        }
    },
    'en': {
        commitTypes: [
            { label: 'feat: ✨ New Feature', value: 'feat', icon: '✨' },
            { label: 'fix: 🐛 Bug Fix', value: 'fix', icon: '🐛' },
            { label: 'docs: 📝 Documentation', value: 'docs', icon: '📝' },
            { label: 'style: 💄 Formatting', value: 'style', icon: '💄' },
            { label: 'refactor: ♻️ Refactor', value: 'refactor', icon: '♻️' },
            { label: 'perf: ⚡️ Performance', value: 'perf', icon: '⚡️' },
            { label: 'test: ✅ Testing', value: 'test', icon: '✅' },
            { label: 'chore: 🔧 Chore', value: 'chore', icon: '🔧' },
            { label: 'revert: ⏪️ Revert', value: 'revert', icon: '⏪️' },
            { label: 'build: 📦️ Build', value: 'build', icon: '📦️' },
            { label: 'ci: 👷 CI', value: 'ci', icon: '👷' },
            { label: 'ui: 🎨 UI', value: 'ui', icon: '🎨' }
        ],
        messages: {
            noWorkspace: 'Please open a workspace first',
            noChanges: 'No changes to commit',
            hasUnpushedCommits: 'No changes to commit, but found unpushed commits. Would you like to push to remote?',
            selectFiles: 'Select files to commit',
            selectCommitType: 'Select commit type',
            enterCommitMessage: 'Enter commit message',
            commitSuccess: 'Commit successful!',
            pushSuccess: 'Push successful!',
            pushFailed: 'Push failed',
            commitFailed: 'Commit failed',
            pushQuestion: 'Push to remote repository?',
            yes: 'Yes',
            no: 'No',
            pushing: 'Pushing to remote repository...',
            networkError: 'Failed to connect to GitHub server, please check your network connection or proxy settings',
            authError: 'Authentication failed, please check your Git credentials',
            // Proxy settings
            proxyTitle: 'Proxy Settings',
            enableProxy: 'Enable proxy?',
            proxyHost: 'Enter proxy server address',
            proxyPort: 'Enter proxy server port',
            proxyEnabled: 'Proxy enabled',
            proxyDisabled: 'Proxy disabled',
            proxyError: 'Failed to set proxy',
            config: {
                language: {
                    description: 'Language settings'
                },
                proxy: {
                    enabled: {
                        description: 'Enable proxy'
                    },
                    host: {
                        description: 'Proxy server address'
                    },
                    port: {
                        description: 'Proxy server port'
                    }
                }
            }
        }
    }
};

// 获取当前语言
function getCurrentLanguage() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    return config.get('language', 'zh-cn');
}

// 获取当前语言的文本
function getText(key) {
    const lang = getCurrentLanguage();
    const messages = i18n[lang].messages;
    return messages[key] || i18n['en'].messages[key] || key;
}

// 获取当前语言的提交类型
function getCommitTypes() {
    const lang = getCurrentLanguage();
    return i18n[lang].commitTypes;
}

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
        placeHolder: getText('selectFiles')
    });

    return selectedItems ? selectedItems.map(item => item.label) : null;
}

async function selectCommitType() {
    const selected = await vscode.window.showQuickPick(getCommitTypes(), {
        placeHolder: getText('selectCommitType')
    });

    return selected ? selected : null;
}

async function getCommitMessage(type) {
    const message = await vscode.window.showInputBox({
        placeHolder: getText('enterCommitMessage'),
        prompt: getText('enterCommitMessage')
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
            throw new Error(getText('networkError'));
        } else if (error.message.includes('Authentication failed')) {
            throw new Error(getText('authError'));
        } else {
            throw error;
        }
    }
}

// 检查是否有未推送的提交
async function hasUnpushedCommits(workspaceRoot) {
    try {
        const { stdout } = await spawnAsync('git', ['status', '-sb'], { cwd: workspaceRoot });
        // 检查输出中是否包含 "ahead" 字样，表示有未推送的提交
        return stdout.includes('ahead');
    } catch (error) {
        console.error('检查未推送提交失败:', error);
        return false;
    }
}

// 设置代理配置
async function setProxyConfig() {
    try {
        // 获取当前配置
        const currentConfig = await getProxyConfig();
        
        // 询问是否启用代理
        const enableProxy = await vscode.window.showQuickPick([getText('yes'), getText('no')], {
            placeHolder: getText('enableProxy'),
            title: getText('proxyTitle')
        });
        
        if (!enableProxy) {
            return; // 用户取消
        }

        const enabled = enableProxy === getText('yes');
        let host = currentConfig.host;
        let port = currentConfig.port;

        if (enabled) {
            // 获取代理主机地址
            host = await vscode.window.showInputBox({
                value: currentConfig.host,
                placeHolder: getText('proxyHost'),
                prompt: getText('proxyHost'),
                title: getText('proxyTitle')
            });

            if (!host) {
                return; // 用户取消
            }

            // 获取代理端口
            port = await vscode.window.showInputBox({
                value: currentConfig.port,
                placeHolder: getText('proxyPort'),
                prompt: getText('proxyPort'),
                title: getText('proxyTitle')
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

        vscode.window.showInformationMessage(enabled ? getText('proxyEnabled') : getText('proxyDisabled'));
    } catch (error) {
        console.error('设置代理失败:', error);
        vscode.window.showErrorMessage(getText('proxyError') + ': ' + error.message);
    }
}

class SettingsWebviewProvider {
    constructor(context) {
        this.context = context;
        this._view = undefined;
    }

    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true
        };
        this.updateContent();
    }

    async updateContent() {
        if (!this._view) {
            return;
        }

        const config = vscode.workspace.getConfiguration('gitCommit');
        const currentLanguage = config.get('language', 'zh-cn');
        const proxyEnabled = config.get('proxy.enabled', false);
        const proxyHost = config.get('proxy.host', '127.0.0.1');
        const proxyPort = config.get('proxy.port', '7890');

        this._view.webview.html = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { padding: 10px; }
                .setting-item {
                    margin-bottom: 20px;
                }
                select, input {
                    width: 100%;
                    margin-top: 5px;
                    padding: 5px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    margin-top: 5px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .proxy-settings {
                    margin-top: 10px;
                    display: ${proxyEnabled ? 'block' : 'none'};
                }
            </style>
        </head>
        <body>
            <div class="setting-item">
                <label>${getText('config.language.description')}</label>
                <select id="language">
                    <option value="zh-cn" ${currentLanguage === 'zh-cn' ? 'selected' : ''}>中文</option>
                    <option value="en" ${currentLanguage === 'en' ? 'selected' : ''}>English</option>
                </select>
            </div>
            <div class="setting-item">
                <label>
                    <input type="checkbox" id="proxyEnabled" ${proxyEnabled ? 'checked' : ''}>
                    ${getText('config.proxy.enabled.description')}
                </label>
                <div class="proxy-settings" id="proxySettings">
                    <div>
                        <label>${getText('config.proxy.host.description')}</label>
                        <input type="text" id="proxyHost" value="${proxyHost}">
                    </div>
                    <div>
                        <label>${getText('config.proxy.port.description')}</label>
                        <input type="text" id="proxyPort" value="${proxyPort}">
                    </div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('language').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateLanguage',
                        value: e.target.value
                    });
                });

                document.getElementById('proxyEnabled').addEventListener('change', (e) => {
                    const proxySettings = document.getElementById('proxySettings');
                    proxySettings.style.display = e.target.checked ? 'block' : 'none';
                    vscode.postMessage({
                        command: 'updateProxy',
                        enabled: e.target.checked,
                        host: document.getElementById('proxyHost').value,
                        port: document.getElementById('proxyPort').value
                    });
                });

                document.getElementById('proxyHost').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateProxy',
                        enabled: document.getElementById('proxyEnabled').checked,
                        host: e.target.value,
                        port: document.getElementById('proxyPort').value
                    });
                });

                document.getElementById('proxyPort').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'updateProxy',
                        enabled: document.getElementById('proxyEnabled').checked,
                        host: document.getElementById('proxyHost').value,
                        port: e.target.value
                    });
                });
            </script>
        </body>
        </html>`;

        this._view.webview.onDidReceiveMessage(async message => {
            const config = vscode.workspace.getConfiguration('gitCommit');
            
            switch (message.command) {
                case 'updateLanguage':
                    await config.update('language', message.value, true);
                    vscode.window.showInformationMessage(getText('config.language.description'));
                    break;
                    
                case 'updateProxy':
                    await config.update('proxy.enabled', message.enabled, true);
                    if (message.enabled) {
                        await config.update('proxy.host', message.host, true);
                        await config.update('proxy.port', message.port, true);
                    }
                    vscode.window.showInformationMessage(
                        message.enabled ? getText('proxyEnabled') : getText('proxyDisabled')
                    );
                    break;
            }
        });
    }
}

async function activate(context) {
    console.log('扩展已激活');

    // 注册设置视图提供者
    const settingsProvider = new SettingsWebviewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('git-commit-settings', settingsProvider)
    );

    // 注册提交命令
    let commitDisposable = vscode.commands.registerCommand('git-commit-helper.commit', async () => {
        try {
            console.log('命令开始执行');
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            
            if (!workspaceRoot) {
                throw new Error(getText('noWorkspace'));
            }

            // 获取更改的文件
            const changedFiles = await getChangedFiles(workspaceRoot);
            console.log('更改的文件:', changedFiles);

            if (changedFiles.length === 0) {
                // 检查是否有未推送的提交
                const hasUnpushed = await hasUnpushedCommits(workspaceRoot);
                if (hasUnpushed) {
                    const shouldPush = await vscode.window.showInformationMessage(
                        getText('hasUnpushedCommits'),
                        { modal: true },
                        getText('yes'),
                        getText('no')
                    );

                    if (shouldPush === getText('yes')) {
                        try {
                            await vscode.window.withProgress({
                                location: vscode.ProgressLocation.Notification,
                                title: getText('pushing'),
                                cancellable: false
                            }, async () => {
                                console.log('开始推送...');
                                const pushOutput = await gitPush(workspaceRoot);
                                console.log('推送输出:', pushOutput);
                                vscode.window.showInformationMessage(getText('pushSuccess'));
                            });
                        } catch (error) {
                            console.error('推送失败:', error);
                            const errorMessage = error.message || getText('pushFailed');
                            vscode.window.showErrorMessage(getText('pushFailed') + ': ' + errorMessage);
                        }
                    }
                    return;
                }
                vscode.window.showInformationMessage(getText('noChanges'));
                return;
            }

            // 选择文件
            console.log('等待用户选择文件...');
            const selectedFiles = await selectFiles(changedFiles);
            if (!selectedFiles || selectedFiles.length === 0) {
                vscode.window.showWarningMessage(getText('noChanges'));
                return;
            }

            // 选择提交类型
            console.log('等待用户选择提交类型...');
            const commitType = await selectCommitType();
            if (!commitType) {
                vscode.window.showWarningMessage(getText('selectCommitType'));
                return;
            }

            // 获取提交信息
            console.log('等待用户输入提交信息...');
            const commitMessage = await getCommitMessage(commitType);
            if (!commitMessage) {
                vscode.window.showWarningMessage(getText('enterCommitMessage'));
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
                    getText('commitSuccess') + getText('pushQuestion'),
                    { modal: true },
                    getText('yes'),
                    getText('no')
                );

                if (result === getText('yes')) {
                    console.log('用户选择推送到远程');
                    try {
                        // 显示进度提示
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: getText('pushing'),
                            cancellable: false
                        }, async () => {
                            console.log('开始推送...');
                            const pushOutput = await gitPush(workspaceRoot);
                            console.log('推送输出:', pushOutput.stdout);
                            vscode.window.showInformationMessage(getText('pushSuccess'));
                        });
                    } catch (error) {
                        console.error('推送失败:', error);
                        // 显示更详细的错误信息
                        const errorMessage = error.message || getText('pushFailed');
                        vscode.window.showErrorMessage(getText('pushFailed') + ': ' + errorMessage);
                    }
                } else {
                    console.log('用户选择不推送');
                    vscode.window.showInformationMessage(getText('commitSuccess'));
                }
            } catch (error) {
                console.error('Git操作错误:', error);
                vscode.window.showErrorMessage(getText('commitFailed') + ': ' + error.message);
            }
        } catch (error) {
            console.error('命令执行错误:', error);
            vscode.window.showErrorMessage(getText('commitFailed') + ': ' + error.message);
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
