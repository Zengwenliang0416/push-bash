const { getCurrentLanguage } = require('./i18n');
const i18n = require('../../i18n');

// 获取当前语言的提交类型
function getCommitTypes() {
    const currentLanguage = getCurrentLanguage();
    return i18n[currentLanguage].commitTypes;
}

module.exports = {
    getCommitTypes
};
