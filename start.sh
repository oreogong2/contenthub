#!/bin/bash

# ContentHub 启动脚本

echo "🚀 启动 ContentHub..."
echo ""

# 清理端口
echo "1️⃣ 清理端口..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 1
echo "✅ 端口清理完成"
echo ""

# 启动后端
echo "2️⃣ 启动后端..."
cd /Users/oreo/Desktop/code/contenthub/backend
source venv/bin/activate
nohup python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ 后端已启动 (PID: $BACKEND_PID)"
echo ""

# 等待后端启动
echo "⏳ 等待后端启动..."
sleep 3

# 启动前端
echo "3️⃣ 启动前端..."
cd /Users/oreo/Desktop/code/contenthub/frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端已启动 (PID: $FRONTEND_PID)"
echo ""

# 等待前端启动
echo "⏳ 等待前端启动..."
sleep 3

echo ""
echo "🎉 ContentHub 启动完成！"
echo ""
echo "📝 访问地址："
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:8000"
echo ""
echo "📋 进程信息："
echo "   后端 PID: $BACKEND_PID"
echo "   前端 PID: $FRONTEND_PID"
echo ""
echo "🛑 停止服务："
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📄 日志文件："
echo "   后端: /Users/oreo/Desktop/code/contenthub/backend/backend.log"
echo "   前端: /Users/oreo/Desktop/code/contenthub/frontend/frontend.log"


