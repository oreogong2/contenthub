#!/bin/bash

# ContentHub 自动同步到GitHub脚本

echo "🔄 开始同步到GitHub..."

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 发现未提交的更改，正在提交..."
    
    # 添加所有更改
    git add .
    
    # 生成提交信息
    COMMIT_MSG="Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 提交更改
    git commit -m "$COMMIT_MSG"
    
    if [ $? -eq 0 ]; then
        echo "✅ 提交成功: $COMMIT_MSG"
    else
        echo "❌ 提交失败"
        exit 1
    fi
else
    echo "ℹ️  没有未提交的更改"
fi

# 推送到GitHub
echo "🚀 推送到GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ 同步成功！"
    echo "🌐 你的代码已经同步到GitHub"
else
    echo "❌ 推送失败，请检查网络连接或权限"
    exit 1
fi
