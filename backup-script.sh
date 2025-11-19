#!/bin/bash

# 哲思AI商业智库 - 每周自动备份脚本
# 执行时间: 每周一凌晨2点

set -e

PROJECT_PATH="/home/ubuntu/zesai-business-hub"
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="zesai-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "🔄 开始备份: ${BACKUP_NAME}"

# 创建备份目录
mkdir -p "${BACKUP_PATH}"

# 1. 备份项目代码
echo "📦 备份项目代码..."
cd "${PROJECT_PATH}"
tar -czf "${BACKUP_PATH}/code.tar.gz" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="dist" \
  --exclude="build" \
  --exclude=".next" \
  .

# 2. 备份数据库
echo "💾 备份数据库..."
if [ -n "$DATABASE_URL" ]; then
  # 从 DATABASE_URL 解析连接信息
  # 格式: mysql://user:password@host:port/database
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
  
  # 导出数据库
  mysqldump -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USER}" -p"${DB_PASS}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "${DB_NAME}" > "${BACKUP_PATH}/database.sql"
  
  # 压缩数据库文件
  gzip "${BACKUP_PATH}/database.sql"
  
  echo "✅ 数据库备份完成: database.sql.gz"
else
  echo "⚠️  未找到 DATABASE_URL,跳过数据库备份"
fi

# 3. 创建备份说明文件
cat > "${BACKUP_PATH}/README.txt" << EOF
哲思AI商业智库 - 备份文件
备份时间: $(date '+%Y-%m-%d %H:%M:%S')
备份内容:
  - code.tar.gz: 项目源代码(不含 node_modules)
  - database.sql.gz: 完整数据库导出

恢复说明:
1. 解压代码: tar -xzf code.tar.gz
2. 安装依赖: pnpm install
3. 恢复数据库: gunzip database.sql.gz && mysql -h HOST -u USER -p DATABASE < database.sql
4. 配置环境变量(.env)
5. 启动服务: pnpm run dev

数据库表:
  - users: 用户信息
  - agents: AI顾问配置
  - conversations: 对话会话
  - messages: 对话消息
  - subscriptions: 订阅记录
  - orders: 支付订单
  - usage_records: 使用记录

技术栈:
  - Frontend: React 19 + TypeScript + Tailwind CSS
  - Backend: Node.js + Express + tRPC
  - Database: MySQL/TiDB
  - AI: OpenAI API
EOF

# 4. 打包整个备份
echo "📦 打包备份文件..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

# 5. 清理旧备份(保留最近8周)
echo "🧹 清理旧备份..."
cd "${BACKUP_DIR}"
ls -t zesai-backup-*.tar.gz | tail -n +9 | xargs -r rm

BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "✅ 备份完成!"
echo "📁 备份文件: ${BACKUP_FILE}"
echo "📊 文件大小: ${BACKUP_SIZE}"
echo ""
echo "备份文件已准备好,将发送给用户..."

# 输出备份文件路径供调度任务使用
echo "BACKUP_FILE_PATH=${BACKUP_FILE}"
