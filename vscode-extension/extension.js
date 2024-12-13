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
            proxyError: '设置代理失败',
            // 设置界面文本
            settings: {
                language: {
                    title: '语言选择',
                    description: '选择界面显示语言'
                },
                proxy: {
                    title: '代理设置',
                    description: '配置Git操作的代理服务器',
                    enabled: {
                        title: '启用代理',
                        description: '是否启用代理服务'
                    },
                    host: {
                        title: '代理主机',
                        description: '代理服务器地址',
                        placeholder: '例如: 127.0.0.1, localhost'
                    },
                    port: {
                        title: '代理端口',
                        description: '代理服务器端口',
                        placeholder: '例如: 7890, 1087'
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
            proxyError: 'Failed to set proxy',
            // Settings interface text
            settings: {
                language: {
                    title: 'Language',
                    description: 'Select interface language'
                },
                proxy: {
                    title: 'Proxy Settings',
                    description: 'Configure proxy server for Git operations',
                    enabled: {
                        title: 'Enable Proxy',
                        description: 'Enable proxy service'
                    },
                    host: {
                        title: 'Proxy Host',
                        description: 'Proxy server address',
                        placeholder: 'e.g., 127.0.0.1, localhost'
                    },
                    port: {
                        title: 'Proxy Port',
                        description: 'Proxy server port',
                        placeholder: 'e.g., 7890, 1087'
                    }
                }
            }
        }
    }
};

// 获取当前语言
function getCurrentLanguage() {
    // 首先尝试获取插件的语言设置
    const config = vscode.workspace.getConfiguration('gitCommit');
    const configLanguage = config.get('language');
    
    if (configLanguage && configLanguage !== 'system') {
        return configLanguage;
    }

    // 如果没有设置或设置为 system，则使用 VS Code 的显示语言设置
    const vscodeConfig = vscode.workspace.getConfiguration('locale');
    const displayLanguage = vscodeConfig.get('locale') || vscode.env.language;
    const vscodeLang = displayLanguage.toLowerCase();
    
    // 将 VS Code 的语言代码映射到我们支持的语言
    if (vscodeLang.includes('zh') || vscodeLang.includes('chinese') || vscodeLang.includes('简体')) {
        return 'zh-cn';
    }
    
    // 默认使用英文
    return 'en';
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

        // 获取当前语言的设置文本
        const settingsText = i18n[currentLanguage].messages.settings;

        this._view.webview.html = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    padding: 16px;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-sideBar-background);
                }
                
                .setting-item {
                    background-color: var(--vscode-editor-background);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .setting-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }

                .setting-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .setting-icon {
                    width: 20px;
                    height: 20px;
                    margin-right: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--vscode-textLink-foreground);
                }

                .setting-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--vscode-settings-headerForeground);
                    margin: 0;
                }

                .setting-description {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 12px;
                }

                select, input[type="text"] {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 4px;
                    outline: none;
                    font-size: 13px;
                }

                select:focus, input[type="text"]:focus {
                    border-color: var(--vscode-focusBorder);
                }

                .checkbox-container {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .checkbox-container input[type="checkbox"] {
                    margin-right: 8px;
                }

                .proxy-settings {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--vscode-panel-border);
                    display: ${proxyEnabled ? 'block' : 'none'};
                }

                .input-group {
                    margin-bottom: 12px;
                }

                .input-group label {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 12px;
                    color: var(--vscode-foreground);
                }

                .input-hint {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }

                /* 动画效果 */
                .setting-item {
                    transition: all 0.2s ease;
                }

                .proxy-settings {
                    transition: all 0.3s ease;
                }

                select, input[type="text"] {
                    transition: border-color 0.2s ease;
                }
            </style>
        </head>
        <body>
            <div class="setting-item">
                <div class="setting-header">
                    <div class="setting-icon">🌍</div>
                    <h3 class="setting-title">${settingsText.language.title}</h3>
                </div>
                <div class="setting-description">${settingsText.language.description}</div>
                <select id="language">
                    <option value="system" ${currentLanguage === 'system' ? 'selected' : ''}>
                        ${currentLanguage === 'zh-cn' ? '跟随系统' : 'Follow System'}
                    </option>
                    <option value="zh-cn" ${currentLanguage === 'zh-cn' ? 'selected' : ''}>中文</option>
                    <option value="en" ${currentLanguage === 'en' ? 'selected' : ''}>English</option>
                </select>
            </div>

            <div class="setting-item">
                <div class="setting-header">
                    <div class="setting-icon">🔌</div>
                    <h3 class="setting-title">${settingsText.proxy.title}</h3>
                </div>
                <div class="setting-description">${settingsText.proxy.description}</div>
                <div class="checkbox-container">
                    <input type="checkbox" id="proxyEnabled" ${proxyEnabled ? 'checked' : ''}>
                    <label for="proxyEnabled">${settingsText.proxy.enabled.description}</label>
                </div>
                
                <div class="proxy-settings" id="proxySettings">
                    <div class="input-group">
                        <label for="proxyHost">${settingsText.proxy.host.title}</label>
                        <input type="text" id="proxyHost" value="${proxyHost}">
                        <div class="input-hint">${settingsText.proxy.host.placeholder}</div>
                    </div>
                    <div class="input-group">
                        <label for="proxyPort">${settingsText.proxy.port.title}</label>
                        <input type="text" id="proxyPort" value="${proxyPort}">
                        <div class="input-hint">${settingsText.proxy.port.placeholder}</div>
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

                const debounce = (func, wait) => {
                    let timeout;
                    return function executedFunction(...args) {
                        const later = () => {
                            clearTimeout(timeout);
                            func(...args);
                        };
                        clearTimeout(timeout);
                        timeout = setTimeout(later, wait);
                    };
                };

                const updateProxySettings = debounce(() => {
                    vscode.postMessage({
                        command: 'updateProxy',
                        enabled: document.getElementById('proxyEnabled').checked,
                        host: document.getElementById('proxyHost').value,
                        port: document.getElementById('proxyPort').value
                    });
                }, 500);

                document.getElementById('proxyHost').addEventListener('input', updateProxySettings);
                document.getElementById('proxyPort').addEventListener('input', updateProxySettings);
            </script>
        </body>
        </html>`; 

        this._view.webview.onDidReceiveMessage(async message => {
            const config = vscode.workspace.getConfiguration('gitCommit');
            
            switch (message.command) {
                case 'updateLanguage':
                    await config.update('language', message.value, true);
                    vscode.window.showInformationMessage(getText('config.language.description'));
                    this.updateContent(); // 刷新视图以更新语言
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

    // 监听 VS Code 语言变化
    let currentDisplayLanguage = vscode.workspace.getConfiguration('locale').get('locale');

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('locale.locale') || e.affectsConfiguration('gitCommit.language')) {
                const newDisplayLanguage = vscode.workspace.getConfiguration('locale').get('locale');
                if (newDisplayLanguage !== currentDisplayLanguage) {
                    currentDisplayLanguage = newDisplayLanguage;
                    // 更新设置视图
                    if (settingsProvider && settingsProvider._view) {
                        settingsProvider.updateContent();
                    }
                }
            }
        })
    );

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
