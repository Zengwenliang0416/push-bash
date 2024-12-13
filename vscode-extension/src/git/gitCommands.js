const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// 获取带代理的环境变量
function getGitEnv() {
    const config = vscode.workspace.getConfiguration('gitCommit');
    const proxyEnabled = config.get('proxy.enabled');
    const proxyHost = config.get('proxy.host');
    const proxyPort = config.get('proxy.port');

    if (proxyEnabled && proxyHost && proxyPort) {
        const proxyUrl = `http://${proxyHost}:${proxyPort}`;
        return {
            ...process.env,
            'HTTP_PROXY': proxyUrl,
            'HTTPS_PROXY': proxyUrl,
            'http_proxy': proxyUrl,
            'https_proxy': proxyUrl
        };
    }

    return process.env;
}

// Git 相关的工具函数
async function getChangedFiles(workspaceRoot) {
    try {
        const { stdout } = await execAsync('git status --porcelain', { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
        return stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const status = line.slice(0, 2).trim();
                const filePath = line.slice(3);
                return { status, filePath };
            });
    } catch (error) {
        throw new Error(`Git status failed: ${error.message}`);
    }
}

async function getFileDiff(filePath, workspaceRoot) {
    try {
        const { stdout } = await execAsync(`git diff -- "${filePath}"`, { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
        return stdout;
    } catch (error) {
        console.error('获取文件差异失败:', error);
        throw error;
    }
}

async function gitAdd(files, workspaceRoot) {
    try {
        const fileList = files.join(' ');
        await execAsync(`git add ${fileList}`, { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
    } catch (error) {
        throw new Error(`Git add failed: ${error.message}`);
    }
}

async function gitCommit(message, workspaceRoot) {
    try {
        await execAsync(`git commit -m "${message}"`, { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
    } catch (error) {
        throw new Error(`Git commit failed: ${error.message}`);
    }
}

async function gitPush(workspaceRoot) {
    try {
        await execAsync('git push', { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
    } catch (error) {
        throw new Error(`Git push failed: ${error.message}`);
    }
}

async function hasUnpushedCommits(workspaceRoot) {
    try {
        const { stdout } = await execAsync('git log @{u}..', { 
            cwd: workspaceRoot,
            env: getGitEnv()
        });
        return !!stdout.trim();
    } catch (error) {
        return false;
    }
}

module.exports = {
    getChangedFiles,
    getFileDiff,
    gitAdd,
    gitCommit,
    gitPush,
    hasUnpushedCommits
};
