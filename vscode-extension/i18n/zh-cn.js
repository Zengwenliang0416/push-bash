module.exports = {
    messages: {
        // 提交面板相关
        selectFiles: '选择要提交的文件',
        selectAll: '全选',
        noChanges: '没有需要提交的更改',
        selectCommitType: '选择提交类型',
        enterCommitMessage: '输入提交信息',
        noWorkspace: '未找到工作区',
        commitSuccess: '提交成功',
        pushQuestion: '是否要推送更改？',
        yes: '是',
        no: '否',
        pushing: '正在推送...',
        pushSuccess: '推送成功',
        pushFailed: '推送失败',
        commitFailed: '提交失败',
        hasUnpushedCommits: '有未推送的提交',

        // 命令相关
        command: {
            commit: {
                title: '创建提交'
            },
            setProxy: {
                title: '设置代理'
            }
        },

        // 设置相关
        settings: {
            language: {
                title: '语言',
                description: '选择显示语言（system：跟随VS Code语言）'
            },
            proxy: {
                title: '代理设置',
                enabled: {
                    title: '启用代理',
                    description: '为Git操作启用代理'
                },
                host: {
                    title: '代理主机',
                    description: '代理服务器主机地址'
                },
                port: {
                    title: '代理端口',
                    description: '代理服务器端口号'
                }
            },
            saveSuccess: '设置保存成功'
        }
    }
};
