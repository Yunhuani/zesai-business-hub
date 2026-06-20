#!/bin/bash

# ECS生产环境启动脚本
# 使用方法: bash start-production.sh

cd /home/ubuntu/zesai-business-hub

# 确保dist/index.js存在
if [ ! -f "dist/index.js" ]; then
    echo "Error: dist/index.js not found. Run 'npm run build' first."
    exit 1
fi

# 设置环境变量
export NODE_ENV=production
export PORT=3000

# 使用PM2启动（不使用ecosystem.config.js）
npx pm2 start dist/index.js \
    --name zesai-business-hub \
    --cwd /home/ubuntu/zesai-business-hub \
    -i max \
    --no-autorestart

# 显示状态
npx pm2 status
npx pm2 logs zesai-business-hub --lines 20
