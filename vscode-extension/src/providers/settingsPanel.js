const vscode = require('vscode');
const { getText } = require('../utils/i18n');
const { getProxyConfig, setProxyConfig } = require('../utils/proxyUtils');

class SettingsPanelProvider {
    constructor(context) {
        this.context = context;
        this._view = undefined;
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
        const proxyConfig = getProxyConfig();
        
        return `<!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${getText('settingsPanel.title')}</title>
                    <style>
                        /* Add your styles here */
                    </style>
                </head>
                <body>
                    <!-- Add your settings form here -->
                </body>
            </html>`;
    }

    setupMessageHandlers(webviewView) {
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'saveSettings':
                    await setProxyConfig(message.proxyConfig);
                    vscode.window.showInformationMessage(getText('success.settingsSaved'));
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

module.exports = SettingsPanelProvider;
