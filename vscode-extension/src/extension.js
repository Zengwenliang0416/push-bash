const vscode = require('vscode');
const CommitPanelProvider = require('./providers/commitPanel');
const SettingsPanelProvider = require('./providers/settingsPanel');

function activate(context) {
    // Register commit panel provider
    const commitProvider = new CommitPanelProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'gitCommit.commitPanel',
            commitProvider
        )
    );

    // Register settings panel provider
    const settingsProvider = new SettingsPanelProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'gitCommit.settingsPanel',
            settingsProvider
        )
    );

    // Register commands
    let disposable = vscode.commands.registerCommand('gitCommit.openSettings', () => {
        vscode.commands.executeCommand('workbench.view.extension.gitCommit-settings');
    });
    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
