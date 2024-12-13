module.exports = {
    messages: {
        // 提交面板相关
        selectFiles: 'Select Files to Commit',
        selectAll: 'Select All',
        noChanges: 'No changes to commit',
        selectCommitType: 'Select Commit Type',
        enterCommitMessage: 'Enter Commit Message',
        noWorkspace: 'No workspace found',
        commitSuccess: 'Successfully committed changes',
        pushQuestion: 'Would you like to push the changes?',
        yes: 'Yes',
        no: 'No',
        pushing: 'Pushing changes...',
        pushSuccess: 'Successfully pushed changes',
        pushFailed: 'Failed to push changes',
        commitFailed: 'Failed to commit changes',
        hasUnpushedCommits: 'You have unpushed commits',

        // 命令相关
        command: {
            commit: {
                title: 'Create Commit'
            },
            setProxy: {
                title: 'Set Proxy'
            }
        },

        // 设置相关
        settings: {
            language: {
                title: 'Language',
                description: 'Select display language (system: follow VS Code language)'
            },
            proxy: {
                title: 'Proxy Settings',
                enabled: {
                    title: 'Enable Proxy',
                    description: 'Enable proxy for Git operations'
                },
                host: {
                    title: 'Proxy Host',
                    description: 'Proxy server host address'
                },
                port: {
                    title: 'Proxy Port',
                    description: 'Proxy server port number'
                }
            },
            saveSuccess: 'Settings saved successfully'
        }
    }
};
