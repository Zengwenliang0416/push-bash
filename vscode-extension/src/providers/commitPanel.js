const vscode = require('vscode');
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
        // Implementation of webview HTML content
        return `<!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${getText('commitPanel.title')}</title>
                    <style>
                        /* Add your styles here */
                    </style>
                </head>
                <body>
                    <!-- Add your HTML content here -->
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
                    const files = await git.getChangedFiles();
                    webviewView.webview.postMessage({ command: 'updateFiles', files });
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
