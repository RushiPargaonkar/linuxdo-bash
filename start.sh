#!/bin/bash

echo "🚀 启动LinuxDo自习室..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 构建基础镜像
echo "🐳 构建Ubuntu基础镜像..."
docker build -t linuxdo-ubuntu:latest -f docker/Dockerfile.ubuntu .

if [ $? -ne 0 ]; then
    echo "❌ 镜像构建失败"
    exit 1
fi

echo "✅ 基础镜像构建完成"

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
npm start &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端开发服务器
echo "🎨 启动前端服务..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ 服务启动完成！"
echo ""
echo "📱 前端地址: http://localhost:5173"
echo "🔧 后端地址: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait
