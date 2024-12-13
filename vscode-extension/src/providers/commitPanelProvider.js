const vscode = require('vscode');
const path = require('path');
const { getChangedFiles, getFileDiff, gitAdd, gitCommit, gitPush } = require('../git/gitCommands');
const { getCurrentLanguage, getText } = require('../utils/i18n');
const { getCommitTypes } = require('../utils/commitTypes');

class CommitPanelProvider {
    constructor(context, diffProvider) {
        this.context = context;
        this._view = undefined;
        this.diffProvider = diffProvider;

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
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri
            ]
        };

        this.updateContent();

        // 处理来自 Webview 的消息
        webviewView.webview.onDidReceiveMessage(async message => {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage(getText('noWorkspace'));
                return;
            }

            try {
                switch (message.command) {
                    case 'refresh':
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

                    case 'commit':
                        const { files, type, message: commitMessage } = message;
                        if (!files || files.length === 0) {
                            vscode.window.showErrorMessage(getText('noFilesSelected'));
                            return;
                        }

                        await gitAdd(files, workspaceRoot);
                        await gitCommit(`${type}: ${commitMessage}`, workspaceRoot);
                        vscode.window.showInformationMessage(getText('commitSuccess'));
                        this.updateContent();
                        break;

                    case 'push':
                        await gitPush(workspaceRoot);
                        vscode.window.showInformationMessage(getText('pushSuccess'));
                        break;
                }
            } catch (error) {
                console.error('Git操作错误:', error);
                vscode.window.showErrorMessage(error.message);
            }
        });
    }

    async updateContent() {
        if (!this._view) {
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
        if (!workspaceRoot) {
            this._view.webview.html = this.getWebviewContent([]);
            return;
        }

        try {
            const files = await getChangedFiles(workspaceRoot);
            this._view.webview.html = this.getWebviewContent(files);
        } catch (error) {
            console.error('获取Git状态失败:', error);
            this._view.webview.html = this.getWebviewContent([]);
        }
    }

    getWebviewContent(files) {
        const commitTypes = getCommitTypes();
        return `<!DOCTYPE html>
            <html lang="${getCurrentLanguage()}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    /* 你的样式代码 */
                </style>
            </head>
            <body>
                <!-- 你的HTML代码 -->
            </body>
            </html>`;
    }
}

module.exports = CommitPanelProvider;
