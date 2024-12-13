const vscode = require('vscode');

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

module.exports = DiffContentProvider;
