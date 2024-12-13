const vscode = require('vscode');

function getGitEnv() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    const proxyConfig = config.get('proxy');
    
    if (!proxyConfig || !proxyConfig.enabled) {
        return process.env;
    }

    return {
        ...process.env,
        HTTP_PROXY: proxyConfig.http || '',
        HTTPS_PROXY: proxyConfig.https || '',
        NO_PROXY: proxyConfig.noProxy || ''
    };
}

module.exports = {
    getGitEnv
};
