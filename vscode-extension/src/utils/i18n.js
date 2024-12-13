const vscode = require('vscode');

function getCurrentLanguage() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    const configLanguage = config.get('language');
    
    if (configLanguage && configLanguage !== 'system') {
        return configLanguage;
    }

    const vscodeConfig = vscode.workspace.getConfiguration('locale');
    const displayLanguage = vscodeConfig.get('locale') || vscode.env.language;
    const vscodeLang = displayLanguage.toLowerCase();
    
    if (vscodeLang.includes('zh') || vscodeLang.includes('chinese') || vscodeLang.includes('简体')) {
        return 'zh-cn';
    }
    
    return 'en';
}

function getText(key) {
    const lang = getCurrentLanguage();
    const messages = require(`../../i18n/${lang}.json`);
    return messages[key] || require('../../i18n/en.json')[key] || key;
}

module.exports = {
    getCurrentLanguage,
    getText
};
