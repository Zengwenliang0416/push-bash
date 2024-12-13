const vscode = require('vscode');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);
const i18n = require('./i18n');

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
        const process = exec(command, args, options);
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

// Git 相关的工具函数
async function getChangedFiles(workspaceRoot) {
    try {
        const { stdout } = await execAsync('git status --porcelain', { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
        return stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => ({
                status: line.substring(0, 2).trim(),
                path: line.slice(3).trim()
            }));
    } catch (error) {
        console.error('获取更改文件失败:', error);
        return [];
    }
}

async function getFileDiff(filePath, workspaceRoot) {
    try {
        const { stdout } = await execAsync(`git diff -- "${filePath}"`, { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
        return stdout;
    } catch (error) {
        console.error('获取文件差异失败:', error);
        return '';
    }
}

async function gitAdd(files, workspaceRoot) {
    try {
        const fileList = files.join(' ');
        await execAsync(`git add ${fileList}`, { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
    } catch (error) {
        throw new Error(`Git add failed: ${error.message}`);
    }
}

async function gitCommit(message, workspaceRoot) {
    try {
        await execAsync(`git commit -m "${message}"`, { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
    } catch (error) {
        throw new Error(`Git commit failed: ${error.message}`);
    }
}

async function gitPush(workspaceRoot) {
    try {
        await execAsync('git push', { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
    } catch (error) {
        throw new Error(`Git push failed: ${error.message}`);
    }
}

async function hasUnpushedCommits(workspaceRoot) {
    try {
        const { stdout } = await execAsync('git log @{u}..', { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
        return !!stdout.trim();
    } catch (error) {
        return false;
    }
}

// 获取带代理的环境变量
function getGitEnv() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    const proxyEnabled = config.get('proxy.enabled');
    const proxyHost = config.get('proxy.host');
    const proxyPort = config.get('proxy.port');

    if (proxyEnabled && proxyHost && proxyPort) {
        const proxyUrl = `http://${proxyHost}:${proxyPort}`;
        return {
            ...process.env,
            'HTTP_PROXY': proxyUrl,
            'HTTPS_PROXY': proxyUrl,
            'http_proxy': proxyUrl,
            'https_proxy': proxyUrl
        };
    }

    return process.env;
}

// 提交类型列表
function getCommitTypes() {
    const currentLanguage = getCurrentLanguage();
    const isZhCN = currentLanguage === 'zh-cn';
    
    return [
        { label: isZhCN ? 'feat: ✨ 新功能' : 'feat: ✨ New Feature', value: 'feat', icon: '✨' },
        { label: isZhCN ? 'fix: 🐛 修复' : 'fix: 🐛 Bug Fix', value: 'fix', icon: '🐛' },
        { label: isZhCN ? 'docs: 📝 文档' : 'docs: 📝 Documentation', value: 'docs', icon: '📝' },
        { label: isZhCN ? 'style: 💄 格式' : 'style: 💄 Formatting', value: 'style', icon: '💄' },
        { label: isZhCN ? 'refactor: ♻️ 重构' : 'refactor: ♻️ Refactor', value: 'refactor', icon: '♻️' },
        { label: isZhCN ? 'perf: ⚡️ 性能' : 'perf: ⚡️ Performance', value: 'perf', icon: '⚡️' },
        { label: isZhCN ? 'test: ✅ 测试' : 'test: ✅ Testing', value: 'test', icon: '✅' },
        { label: isZhCN ? 'chore: 🔧 工具' : 'chore: 🔧 Chore', value: 'chore', icon: '🔧' },
        { label: isZhCN ? 'revert: ⏪️ 回退' : 'revert: ⏪️ Revert', value: 'revert', icon: '⏪️' },
        { label: isZhCN ? 'build: 📦️ 打包' : 'build: 📦️ Build', value: 'build', icon: '📦️' },
        { label: isZhCN ? 'ci: 👷 集成' : 'ci: 👷 CI', value: 'ci', icon: '👷' },
        { label: isZhCN ? 'ui: 🎨 界面相关' : 'ui: 🎨 UI', value: 'ui', icon: '🎨' }
    ];
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

async function getProxyConfig() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    return {
        enabled: config.get('proxy.enabled', false),
        host: config.get('proxy.host', '127.0.0.1'),
        port: config.get('proxy.port', '7890')
    };
}

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

        const settingsText = i18n[getCurrentLanguage()].messages;
        const currentConfig = vscode.workspace.getConfiguration('gitCommit');
        const currentLanguage = currentConfig.get('language') || 'system';
        const proxyEnabled = currentConfig.get('proxy.enabled') || false;
        const proxyHost = currentConfig.get('proxy.host') || '';
        const proxyPort = currentConfig.get('proxy.port') || '';

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
                
                .panel-section {
                    background-color: var(--vscode-editor-background);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .section-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--vscode-settings-headerForeground);
                    margin: 0 0 12px 0;
                }

                .setting-item {
                    margin-bottom: 16px;
                }

                .setting-label {
                    display: block;
                    margin-bottom: 8px;
                    color: var(--vscode-foreground);
                }

                .setting-description {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 8px;
                }

                select, input[type="text"], input[type="number"] {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 4px;
                    outline: none;
                    font-size: 13px;
                }

                select:focus, input[type="text"]:focus, input[type="number"]:focus {
                    border-color: var(--vscode-focusBorder);
                }

                .checkbox-container {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                }

                input[type="checkbox"] {
                    margin-right: 8px;
                }

                button {
                    width: 100%;
                    padding: 8px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-top: 8px;
                }

                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            </style>
        </head>
        <body>
            <div class="panel-section">
                <h3 class="section-title">${settingsText.settings.language.title}</h3>
                <div class="setting-item">
                    <div class="setting-description">
                        ${settingsText.settings.language.description}
                    </div>
                    <select id="language">
                        <option value="system" ${currentLanguage === 'system' ? 'selected' : ''}>
                            ${settingsText === i18n['zh-cn'].messages ? '跟随VS Code语言' : 'Follow VS Code Language'}
                        </option>
                        <option value="zh-cn" ${currentLanguage === 'zh-cn' ? 'selected' : ''}>中文</option>
                        <option value="en" ${currentLanguage === 'en' ? 'selected' : ''}>English</option>
                    </select>
                </div>
            </div>

            <div class="panel-section">
                <h3 class="section-title">${settingsText.settings.proxy.title}</h3>
                
                <div class="setting-item">
                    <div class="checkbox-container">
                        <input type="checkbox" id="proxyEnabled" ${proxyEnabled ? 'checked' : ''}>
                        <label for="proxyEnabled" class="setting-label">
                            ${settingsText.settings.proxy.enabled.title}
                        </label>
                    </div>
                    <div class="setting-description">
                        ${settingsText.settings.proxy.enabled.description}
                    </div>
                </div>

                <div class="setting-item">
                    <label for="proxyHost" class="setting-label">
                        ${settingsText.settings.proxy.host.title}
                    </label>
                    <div class="setting-description">
                        ${settingsText.settings.proxy.host.description}
                    </div>
                    <input type="text" id="proxyHost" value="${proxyHost}" 
                           placeholder="127.0.0.1">
                </div>

                <div class="setting-item">
                    <label for="proxyPort" class="setting-label">
                        ${settingsText.settings.proxy.port.title}
                    </label>
                    <div class="setting-description">
                        ${settingsText.settings.proxy.port.description}
                    </div>
                    <input type="number" id="proxyPort" value="${proxyPort}" 
                           placeholder="7890">
                </div>

                <button id="saveButton">
                    ${settingsText === i18n['zh-cn'].messages ? '保存设置' : 'Save Settings'}
                </button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // 语言选择变化事件
                document.getElementById('language').addEventListener('change', (e) => {
                    vscode.postMessage({
                        command: 'saveSettings',
                        settings: {
                            language: e.target.value,
                            proxyEnabled: document.getElementById('proxyEnabled').checked,
                            proxyHost: document.getElementById('proxyHost').value,
                            proxyPort: document.getElementById('proxyPort').value
                        }
                    });
                });

                // 保存按钮点击事件
                document.getElementById('saveButton').addEventListener('click', () => {
                    const language = document.getElementById('language').value;
                    const proxyEnabled = document.getElementById('proxyEnabled').checked;
                    const proxyHost = document.getElementById('proxyHost').value;
                    const proxyPort = document.getElementById('proxyPort').value;
                    
                    vscode.postMessage({
                        command: 'saveSettings',
                        settings: {
                            language,
                            proxyEnabled,
                            proxyHost,
                            proxyPort
                        }
                    });
                });
            </script>
        </body>
        </html>`;

        this._view.webview.onDidReceiveMessage(async message => {
            try {
                switch (message.command) {
                    case 'saveSettings':
                        const { settings } = message;
                        const config = vscode.workspace.getConfiguration('gitCommit');
                        
                        if (settings.language) {
                            await config.update('language', settings.language, true);
                        }
                        await config.update('proxy.enabled', settings.proxyEnabled, true);
                        await config.update('proxy.host', settings.proxyHost, true);
                        await config.update('proxy.port', settings.proxyPort, true);
                        
                        vscode.window.showInformationMessage(settingsText.settings.saveSuccess);
                        
                        // 如果语言设置改变了，刷新面板
                        if (settings.language && settings.language !== currentLanguage) {
                            this.updateContent();
                        }
                        break;
                }
            } catch (error) {
                console.error('保存设置失败:', error);
                vscode.window.showErrorMessage(error.message);
            }
        });
    }
}

class CommitPanelProvider {
    constructor(context, diffProvider) {
        this.context = context;
        this._view = undefined;
        this.diffProvider = diffProvider;  // 保存diffProvider引用

        // 监听配置变化
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('gitCommit.language') || e.affectsConfiguration('locale.locale')) {
                    this.updateContent();
                }
            })
        );
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

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        let changedFiles = [];
        if (workspaceRoot) {
            changedFiles = await getChangedFiles(workspaceRoot);
        }

        const settingsText = i18n[getCurrentLanguage()].messages;
        const commitTypes = getCommitTypes();

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
                
                .panel-section {
                    background-color: var(--vscode-editor-background);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .section-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--vscode-settings-headerForeground);
                    margin: 0 0 12px 0;
                }

                .file-list {
                    margin-bottom: 16px;
                }

                .file-item {
                    display: flex;
                    align-items: center;
                    padding: 6px;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .file-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }

                .file-checkbox {
                    margin-right: 8px;
                }

                .file-status {
                    margin-right: 8px;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .file-status.modified {
                    background-color: var(--vscode-gitDecoration-modifiedResourceForeground);
                    color: var(--vscode-editor-background);
                }

                .file-status.added {
                    background-color: var(--vscode-gitDecoration-addedResourceForeground);
                    color: var(--vscode-editor-background);
                }

                .file-status.deleted {
                    background-color: var(--vscode-gitDecoration-deletedResourceForeground);
                    color: var(--vscode-editor-background);
                }

                .select-all-container {
                    display: flex;
                    align-items: center;
                    padding: 8px 6px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    margin-bottom: 8px;
                }

                select, input[type="text"] {
                    width: 100%;
                    padding: 8px;
                    margin-bottom: 12px;
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

                .commit-button {
                    width: 100%;
                    padding: 8px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-top: 8px;
                }

                .commit-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }

                .commit-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .status-message {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 8px;
                    text-align: center;
                }

                .error-message {
                    color: var(--vscode-errorForeground);
                }

                .diff-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                }

                .diff-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    border-radius: 6px;
                    max-width: 80%;
                    max-height: 80%;
                    overflow: auto;
                }

                .diff-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .diff-close {
                    cursor: pointer;
                    padding: 4px 8px;
                    border: none;
                    background: none;
                    color: var(--vscode-foreground);
                }

                .diff-pre {
                    margin: 0;
                    padding: 16px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    overflow: auto;
                    font-family: monospace;
                    white-space: pre;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="panel-section">
                <h3 class="section-title">${settingsText.selectFiles}</h3>
                <div class="file-list">
                    ${changedFiles.length > 0 ? `
                        <div class="select-all-container">
                            <input type="checkbox" id="selectAll" class="file-checkbox">
                            <label for="selectAll">${settingsText.selectAll}</label>
                        </div>
                        ${changedFiles.map(file => {
                            const statusText = file.status === 'M' ? 'Modified' :
                                             file.status === 'A' ? 'Added' :
                                             file.status === 'D' ? 'Deleted' : file.status;
                            const statusClass = file.status === 'M' ? 'modified' :
                                              file.status === 'A' ? 'added' :
                                              file.status === 'D' ? 'deleted' : '';
                            return `
                                <div class="file-item" data-path="${file.path}">
                                    <input type="checkbox" class="file-checkbox" value="${file.path}" id="file-${file.path}">
                                    <span class="file-status ${statusClass}">${statusText}</span>
                                    <label for="file-${file.path}">${file.path}</label>
                                </div>
                            `;
                        }).join('')}
                    ` : `<div class="status-message">${settingsText.noChanges}</div>`}
                </div>
            </div>

            <div class="panel-section">
                <h3 class="section-title">${settingsText.selectCommitType}</h3>
                <select id="commitType">
                    <option value="">${settingsText.selectCommitType}</option>
                    ${commitTypes.map(type => `
                        <option value="${type.value}">${type.label}</option>
                    `).join('')}
                </select>

                <h3 class="section-title">${settingsText.enterCommitMessage}</h3>
                <input type="text" id="commitMessage" placeholder="${settingsText.enterCommitMessage}">

                <button id="commitButton" class="commit-button" disabled>
                    ${settingsText.command.commit.title}
                </button>
            </div>

            <div id="diffModal" class="diff-modal">
                <div class="diff-content">
                    <div class="diff-header">
                        <h3 class="section-title" id="diffTitle"></h3>
                        <button class="diff-close" id="closeDiff">×</button>
                    </div>
                    <pre class="diff-pre" id="diffContent"></pre>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function updateCommitButtonState() {
                    const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:not(#selectAll):checked')).map(cb => cb.value);
                    const commitType = document.getElementById('commitType').value;
                    const commitMessage = document.getElementById('commitMessage').value;
                    
                    document.getElementById('commitButton').disabled = 
                        selectedFiles.length === 0 || !commitType || !commitMessage;
                }

                // 全选功能
                document.getElementById('selectAll').addEventListener('change', (e) => {
                    const checkboxes = document.querySelectorAll('.file-checkbox:not(#selectAll)');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = e.target.checked;
                    });
                    updateCommitButtonState();
                });

                // 监听单个文件选择变化
                document.querySelectorAll('.file-checkbox:not(#selectAll)').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const allCheckboxes = document.querySelectorAll('.file-checkbox:not(#selectAll)');
                        const selectAllCheckbox = document.getElementById('selectAll');
                        selectAllCheckbox.checked = Array.from(allCheckboxes).every(cb => cb.checked);
                        selectAllCheckbox.indeterminate = Array.from(allCheckboxes).some(cb => cb.checked) && 
                                                        !Array.from(allCheckboxes).every(cb => cb.checked);
                        updateCommitButtonState();
                    });
                });

                // 文件项双击事件
                document.querySelectorAll('.file-item').forEach(item => {
                    item.addEventListener('dblclick', () => {
                        const filePath = item.dataset.path;
                        vscode.postMessage({
                            command: 'showDiff',
                            filePath: filePath
                        });
                    });
                });

                // 关闭差异对话框
                document.getElementById('closeDiff').addEventListener('click', () => {
                    document.getElementById('diffModal').style.display = 'none';
                });

                // 监听提交类型变化
                document.getElementById('commitType').addEventListener('change', updateCommitButtonState);

                // 监听提交信息变化
                document.getElementById('commitMessage').addEventListener('input', updateCommitButtonState);

                // 提交按钮点击事件
                document.getElementById('commitButton').addEventListener('click', () => {
                    const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:not(#selectAll):checked')).map(cb => cb.value);
                    const commitType = document.getElementById('commitType').value;
                    const commitMessage = document.getElementById('commitMessage').value;
                    
                    vscode.postMessage({
                        command: 'commit',
                        files: selectedFiles,
                        type: commitType,
                        message: commitMessage
                    });
                });

                // 处理来自扩展的消息
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'showDiff':
                            const modal = document.getElementById('diffModal');
                            const title = document.getElementById('diffTitle');
                            const content = document.getElementById('diffContent');
                            
                            title.textContent = message.filePath;
                            content.textContent = message.diff;
                            modal.style.display = 'block';
                            break;
                    }
                });
            </script>
        </body>
        </html>`;

        this._view.webview.onDidReceiveMessage(async message => {
            try {
                switch (message.command) {
                    case 'commit':
                        const { files, type, message: commitMessage } = message;
                        if (!workspaceRoot) {
                            throw new Error(settingsText.noWorkspace);
                        }

                        // 构建提交信息
                        const type_info = commitTypes.find(t => t.value === type);
                        const fullCommitMessage = `${type_info.value}: ${type_info.icon} ${commitMessage}`;

                        // 执行git操作
                        await gitAdd(files, workspaceRoot);
                        await gitCommit(fullCommitMessage, workspaceRoot);
                        
                        // 提示提交成功
                        vscode.window.showInformationMessage(settingsText.commitSuccess);

                        // 询问是否推送
                        const shouldPush = await vscode.window.showInformationMessage(
                            settingsText.pushQuestion,
                            { modal: true },
                            settingsText.yes,
                            settingsText.no
                        );

                        if (shouldPush === settingsText.yes) {
                            await vscode.window.withProgress({
                                location: vscode.ProgressLocation.Notification,
                                title: settingsText.pushing,
                                cancellable: false
                            }, async () => {
                                await gitPush(workspaceRoot);
                                vscode.window.showInformationMessage(settingsText.pushSuccess);
                            });
                        }

                        // 刷新面板
                        this.updateContent();
                        break;

                    case 'showDiff':
                        const { filePath } = message;
                        try {
                            // 获取文件差异
                            const diff = await getFileDiff(filePath, workspaceRoot);
                            // 使用虚拟文档显示差异
                            await this.diffProvider.showDiff(diff);
                        } catch (error) {
                            vscode.window.showErrorMessage(`无法显示文件差异: ${error.message}`);
                        }
                        break;
                }
            } catch (error) {
                console.error('Git操作错误:', error);
                vscode.window.showErrorMessage(error.message);
            }
        });
    }
}

// 创建虚拟文档提供者
class DiffContentProvider {
    constructor() {
        this._onDidChange = new vscode.EventEmitter();
        this.uri = vscode.Uri.parse('git-diff:/diff-preview');
    }

    provideTextDocumentContent(uri) {
        return this._content;
    }

    async showDiff(diff) {
        this._content = diff;
        this._onDidChange.fire(this.uri);
        
        const doc = await vscode.workspace.openTextDocument(this.uri);
        const editor = await vscode.window.showTextDocument(doc, {
            preview: true,
            viewColumn: vscode.ViewColumn.Active
        });

        // 设置语言模式为 diff
        await vscode.languages.setTextDocumentLanguage(doc, 'diff');
        // 设置为只读模式
        editor.options = { ...editor.options, readOnly: true };
    }
}

async function activate(context) {
    console.log('扩展已激活');

    // 创建并注册差异内容提供者
    const diffProvider = new DiffContentProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('git-diff', diffProvider)
    );

    // 应用默认设置
    const config = vscode.workspace.getConfiguration('gitCommit');
    const defaultSettings = {
        'language': config.get('language') || 'system',
        'proxy.enabled': config.get('proxy.enabled') || false,
        'proxy.host': config.get('proxy.host') || '',
        'proxy.port': config.get('proxy.port') || ''
    };

    // 更新配置
    for (const [key, value] of Object.entries(defaultSettings)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

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
                    // 更新提交面板
                    if (commitPanelProvider && commitPanelProvider._view) {
                        commitPanelProvider.updateContent();
                    }
                }
            }
        })
    );

    // 注册提交面板提供者
    const commitPanelProvider = new CommitPanelProvider(context, diffProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('git-commit-panel', commitPanelProvider)
    );

    // 注册设置视图提供者
    const settingsProvider = new SettingsWebviewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('git-commit-settings', settingsProvider)
    );

    // 注册命令
    let commitDisposable = vscode.commands.registerCommand('git-commit-helper.commit', async () => {
        // 打开提交面板
        await vscode.commands.executeCommand('workbench.view.extension.git-commit-helper');
    });

    let proxyDisposable = vscode.commands.registerCommand('git-commit-helper.setProxy', async () => {
        // 打开设置面板
        await vscode.commands.executeCommand('workbench.view.extension.git-commit-helper');
    });

    context.subscriptions.push(commitDisposable, proxyDisposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
