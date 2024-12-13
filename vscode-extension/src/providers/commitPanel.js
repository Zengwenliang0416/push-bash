const vscode = require('vscode');
const path = require('path');
const { getText } = require('../utils/i18n');
const GitCommands = require('../commands/gitCommands');

class CommitPanelProvider {
    constructor(context) {
        this.context = context;
        this._view = undefined;
        
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('gitCommit.language') || e.affectsConfiguration('locale.locale')) {
                    this.updateContent();
                }
            })
        );

        // 监听文件系统变化
        const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        context.subscriptions.push(
            fileSystemWatcher.onDidChange(() => this.updateContent()),
            fileSystemWatcher.onDidCreate(() => this.updateContent()),
            fileSystemWatcher.onDidDelete(() => this.updateContent())
        );
    }

    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri
            ]
        };

        webviewView.webview.html = this.getWebviewContent();
        this.setupMessageHandlers(webviewView);
    }

    getWebviewContent() {
        return `<!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        .file-tree {
                            padding: 10px;
                        }
                        .directory {
                            margin-bottom: 10px;
                        }
                        .directory-name {
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .file {
                            padding: 5px;
                            margin-left: 20px;
                            display: flex;
                            align-items: center;
                        }
                        .file-status {
                            margin-right: 10px;
                            padding: 2px 5px;
                            border-radius: 3px;
                            font-size: 12px;
                        }
                        .status-modified { background-color: #e2b93d; }
                        .status-added { background-color: #3fb950; }
                        .status-deleted { background-color: #f85149; }
                        .status-renamed { background-color: #a371f7; }
                        .status-untracked { background-color: #8b949e; }
                    </style>
                </head>
                <body>
                    <div class="file-tree" id="fileTree"></div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        
                        // 请求更新文件列表
                        function updateFiles() {
                            vscode.postMessage({ command: 'getChangedFiles' });
                        }

                        // 初始化时更新文件列表
                        updateFiles();

                        // 处理来自扩展的消息
                        window.addEventListener('message', event => {
                            const message = event.data;
                            switch (message.command) {
                                case 'updateFiles':
                                    const { filesByDirectory } = message.data;
                                    renderFileTree(filesByDirectory);
                                    break;
                            }
                        });

                        // 渲染文件树
                        function renderFileTree(filesByDirectory) {
                            const fileTree = document.getElementById('fileTree');
                            fileTree.innerHTML = '';

                            Object.entries(filesByDirectory).forEach(([directory, files]) => {
                                const directoryEl = document.createElement('div');
                                directoryEl.className = 'directory';

                                const directoryNameEl = document.createElement('div');
                                directoryNameEl.className = 'directory-name';
                                directoryNameEl.textContent = directory === '.' ? 'Root' : directory;
                                directoryEl.appendChild(directoryNameEl);

                                files.forEach(file => {
                                    const fileEl = document.createElement('div');
                                    fileEl.className = 'file';

                                    const statusEl = document.createElement('span');
                                    statusEl.className = \`file-status status-\${file.type}\`;
                                    statusEl.textContent = file.type;
                                    fileEl.appendChild(statusEl);

                                    const nameEl = document.createElement('span');
                                    nameEl.textContent = file.name;
                                    fileEl.appendChild(nameEl);

                                    directoryEl.appendChild(fileEl);
                                });

                                fileTree.appendChild(directoryEl);
                            });
                        }
                    </script>
                </body>
            </html>`;
    }

    setupMessageHandlers(webviewView) {
        webviewView.webview.onDidReceiveMessage(async message => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage(getText('error.noWorkspace'));
                return;
            }

            const git = new GitCommands(workspaceRoot);

            switch (message.command) {
                case 'getChangedFiles':
                    const result = await git.getChangedFiles();
                    webviewView.webview.postMessage({ 
                        command: 'updateFiles', 
                        data: result 
                    });
                    break;
                case 'commit':
                    const success = await git.commit(message.message);
                    if (success) {
                        vscode.window.showInformationMessage(getText('success.committed'));
                        this.updateContent();
                    }
                    break;
                // Add more message handlers as needed
            }
        });
    }

    updateContent() {
        if (this._view) {
            this._view.webview.html = this.getWebviewContent();
        }
    }
}

module.exports = CommitPanelProvider;
