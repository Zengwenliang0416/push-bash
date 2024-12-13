const vscode = require('vscode');
const i18n = require('../../i18n');

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

module.exports = {
    getCurrentLanguage,
    getText
};
