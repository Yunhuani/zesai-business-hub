#!/bin/bash
# Railway 启动脚本

# 设置 Node 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 启动服务器
npm run start
