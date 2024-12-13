const vscode = require('vscode');

function getProxyConfig() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    return config.get('proxy') || {
        enabled: false,
        http: '',
        https: '',
        noProxy: ''
    };
}

async function setProxyConfig(proxyConfig) {
    const config = vscode.workspace.getConfiguration('gitCommit');
    await config.update('proxy', proxyConfig, vscode.ConfigurationTarget.Global);
}

module.exports = {
    getProxyConfig,
    setProxyConfig
};
