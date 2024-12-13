const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { getGitEnv } = require('../utils/gitUtils');

// Git commands class
class GitCommands {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }

    async getChangedFiles() {
        try {
            const { stdout } = await execAsync('git status --porcelain', { 
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });
            return stdout
                .split('\n')
                .filter(line => line.trim())
                .map(line => ({
                    status: line.substring(0, 2).trim(),
                    path: line.slice(3).trim()
                }));
        } catch (error) {
            console.error('Failed to get changed files:', error);
            return [];
        }
    }

    async getFileDiff(filePath) {
        try {
            const { stdout } = await execAsync(`git diff -- "${filePath}"`, { 
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });
            return stdout;
        } catch (error) {
            console.error('Failed to get file diff:', error);
            return '';
        }
    }

    async add(files) {
        try {
            const fileList = Array.isArray(files) ? files.join(' ') : files;
            await execAsync(`git add ${fileList}`, {
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });
            return true;
        } catch (error) {
            console.error('Failed to add files:', error);
            return false;
        }
    }

    async commit(message) {
        try {
            await execAsync(`git commit -m "${message}"`, {
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });
            return true;
        } catch (error) {
            console.error('Failed to commit:', error);
            return false;
        }
    }

    async push() {
        try {
            await execAsync('git push', {
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });
            return true;
        } catch (error) {
            console.error('Failed to push:', error);
            return false;
        }
    }

    async hasUnpushedCommits() {
        try {
            const { stdout } = await execAsync('git log @{u}..HEAD', {
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });
            return !!stdout.trim();
        } catch (error) {
            console.error('Failed to check unpushed commits:', error);
            return false;
        }
    }
}

module.exports = GitCommands;
