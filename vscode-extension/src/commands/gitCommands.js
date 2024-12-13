const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);
const { getGitEnv } = require('../utils/gitUtils');

// Git commands class
class GitCommands {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }

    async getChangedFiles() {
        try {
            // 获取未暂存的更改
            const { stdout: unstaged } = await execAsync('git status --porcelain', { 
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });

            // 获取已暂存的更改
            const { stdout: staged } = await execAsync('git diff --cached --name-status', {
                cwd: this.workspaceRoot,
                env: getGitEnv()
            });

            // 解析未暂存的文件
            const unstagedFiles = unstaged
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const status = line.substring(0, 2).trim();
                    const filePath = line.slice(3).trim();
                    const fileName = path.basename(filePath);
                    const directory = path.dirname(filePath);
                    
                    return {
                        status,
                        path: filePath,
                        name: fileName,
                        directory,
                        staged: false,
                        type: this.getChangeType(status)
                    };
                });

            // 解析已暂存的文件
            const stagedFiles = staged
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [status, filePath] = line.split('\t');
                    const fileName = path.basename(filePath);
                    const directory = path.dirname(filePath);
                    
                    return {
                        status,
                        path: filePath,
                        name: fileName,
                        directory,
                        staged: true,
                        type: this.getChangeType(status)
                    };
                });

            // 按目录组织文件
            const filesByDirectory = {};
            [...unstagedFiles, ...stagedFiles].forEach(file => {
                if (!filesByDirectory[file.directory]) {
                    filesByDirectory[file.directory] = [];
                }
                filesByDirectory[file.directory].push(file);
            });

            return {
                files: [...unstagedFiles, ...stagedFiles],
                filesByDirectory
            };
        } catch (error) {
            console.error('Failed to get changed files:', error);
            return { files: [], filesByDirectory: {} };
        }
    }

    getChangeType(status) {
        switch (status.charAt(0)) {
            case 'M': return 'modified';
            case 'A': return 'added';
            case 'D': return 'deleted';
            case 'R': return 'renamed';
            case 'C': return 'copied';
            case 'U': return 'updated';
            case '?': return 'untracked';
            default: return 'unknown';
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
