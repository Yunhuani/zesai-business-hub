#!/bin/bash
# MySQL/TiDB 到 PostgreSQL 数据迁移脚本

# 配置
MYSQL_DUMP_FILE="../zesai_backup_20250428.sql"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-zesai}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

echo "🚀 开始数据库迁移..."
echo ""

# 检查文件
if [ ! -f "$MYSQL_DUMP_FILE" ]; then
    echo "❌ 错误：找不到MySQL备份文件: $MYSQL_DUMP_FILE"
    exit 1
fi

echo "📁 找到备份文件: $MYSQL_DUMP_FILE"

# 创建临时转换文件
CONVERTED_SQL="/tmp/zesai_converted_$(date +%s).sql"

echo "🔄 转换SQL格式 (MySQL → PostgreSQL)..."

# 使用sed进行基础转换
cat "$MYSQL_DUMP_FILE" | \
    # 移除MySQL特定的注释和设置
    sed 's/\/\*![0-9]*\s*SET\s.*//g' | \
    sed 's/\/\*![0-9]*\s*//g' | \
    # 转换AUTO_INCREMENT到SERIAL
    sed 's/AUTO_INCREMENT//gi' | \
    # 转换INT到INTEGER
    sed 's/\bint\b/INTEGER/gi' | \
    # 转换TINYINT到SMALLINT
    sed 's/\btinyint\b/SMALLINT/gi' | \
    # 转换DATETIME到TIMESTAMP
    sed 's/\bdatetime\b/TIMESTAMP/gi' | \
    # 转换反引号为双引号
    sed 's/`/"/g' | \
    # 移除COLLATE设置
    sed 's/COLLATE\s*utf8mb4_bin//gi' | \
    sed 's/COLLATE\s*utf8mb4_unicode_ci//gi' | \
    # 移除ENGINE设置
    sed 's/ENGINE=InnoDB//gi' | \
    # 移除DEFAULT CHARSET
    sed 's/DEFAULT CHARSET=utf8mb4//gi' | \
    # 转换NOW()到CURRENT_TIMESTAMP
    sed 's/DEFAULT NOW()/DEFAULT CURRENT_TIMESTAMP/gi' | \
    # 移除UNSIGNED
    sed 's/UNSIGNED//gi' | \
    # 移除CLUSTERED索引标记
    sed 's/\/\*T!\[clustered_index\] CLUSTERED \*\///g' | \
    # 转换LOCK/UNLOCK TABLES为事务
    sed 's/LOCK TABLES/BEGIN;/g' | \
    sed 's/UNLOCK TABLES/COMMIT;/g' | \
    # 转换INSERT IGNORE为INSERT
    sed 's/INSERT IGNORE/INSERT/gi' | \
    # 移除DISABLE/ENABLE KEYS
    sed 's/ALTER TABLE.*DISABLE KEYS;//g' | \
    sed 's/ALTER TABLE.*ENABLE KEYS;//g' | \
    # 转换UNIQUE KEY到UNIQUE
    sed 's/UNIQUE KEY/UNIQUE/gi' > "$CONVERTED_SQL"

echo "✅ 转换完成: $CONVERTED_SQL"
echo ""

# 检查PostgreSQL连接
echo "🔌 检查PostgreSQL连接..."
export PGPASSWORD="$POSTGRES_PASSWORD"

if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ 错误：无法连接到PostgreSQL"
    echo "请检查:"
    echo "  - POSTGRES_HOST: $POSTGRES_HOST"
    echo "  - POSTGRES_PORT: $POSTGRES_PORT"
    echo "  - POSTGRES_USER: $POSTGRES_USER"
    echo "  - POSTGRES_PASSWORD: ******"
    exit 1
fi

echo "✅ PostgreSQL连接正常"
echo ""

# 创建数据库
echo "📦 创建数据库 (如果不存在)..."
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -c "
    SELECT 'CREATE DATABASE $POSTGRES_DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB')
\gexec"

echo ""
echo "📥 导入数据到PostgreSQL..."
echo "   这可能需要几分钟时间..."
echo ""

# 导入转换后的SQL
if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$CONVERTED_SQL" 2>&1 | tee /tmp/migration_log.txt; then
    echo ""
    echo "✅ 数据迁移成功！"
    echo ""

    # 显示统计信息
    echo "📊 迁移统计:"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        SELECT
            'users' as table_name, COUNT(*) as count FROM users
            UNION ALL SELECT 'agents', COUNT(*) FROM agents
            UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
            UNION ALL SELECT 'messages', COUNT(*) FROM messages
            UNION ALL SELECT 'orders', COUNT(*) FROM orders
            UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
            UNION ALL SELECT 'credits_transactions', COUNT(*) FROM credits_transactions;
    "

    # 清理临时文件
    rm "$CONVERTED_SQL"

    echo ""
    echo "🎉 迁移完成！"
    echo ""
    echo "数据库连接字符串:"
    echo "  postgresql://$POSTGRES_USER:******@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
else
    echo ""
    echo "❌ 迁移过程中出现错误"
    echo "错误日志: /tmp/migration_log.txt"
    echo ""
    echo "常见问题:"
    echo "  1. 如果看到 'database does not exist'，请手动创建数据库"
    echo "  2. 如果看到 'permission denied'，请检查用户权限"
    echo "  3. 如果看到语法错误，可能需要手动调整SQL文件"
    exit 1
fi
