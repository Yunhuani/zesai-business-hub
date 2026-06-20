#!/usr/bin/env node
/**
 * MySQL/TiDB 到 PostgreSQL 数据迁移脚本
 * 使用Node.js，跨平台支持
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // MySQL SQL文件路径
  mysqlDumpFile: path.join(__dirname, '..', 'zesai_backup_20250428.sql'),
  // 转换后的输出文件
  outputFile: path.join(__dirname, '..', 'zesai_converted_postgres.sql'),
};

// 表名映射（用于处理特殊表名）
const TABLE_NAME_MAPPING = {};

/**
 * 转换MySQL SQL为PostgreSQL SQL
 */
function convertMySQLToPostgreSQL(mysqlSQL) {
  console.log('🔄 正在转换SQL格式 (MySQL → PostgreSQL)...\n');

  let pgSQL = mysqlSQL;
  let changes = [];

  // 1. 移除MySQL特定的注释和设置
  const originalLength = pgSQL.length;
  pgSQL = pgSQL.replace(/\/\*![0-9]*\s*SET\s[^*]+\*\//gi, '');
  pgSQL = pgSQL.replace(/\/\*![0-9]*\s*\*\//gi, '');
  pgSQL = pgSQL.replace(/^--.*$/gm, '');
  if (pgSQL.length !== originalLength) {
    changes.push('✓ 移除MySQL特定注释和设置');
  }

  // 2. 转换反引号为双引号
  pgSQL = pgSQL.replace(/`([^`]+)`/g, '"$1"');
  changes.push('✓ 转换反引号为双引号');

  // 3. 转换数据类型
  pgSQL = pgSQL.replace(/\btinyint\b/gi, 'SMALLINT');
  pgSQL = pgSQL.replace(/\bint\s+unsigned\b/gi, 'INTEGER');
  pgSQL = pgSQL.replace(/\bbigint\s+unsigned\b/gi, 'BIGINT');
  pgSQL = pgSQL.replace(/\bint\b(?=.*AUTO_INCREMENT)/gi, 'SERIAL');
  pgSQL = pgSQL.replace(/\bdatetime\b/gi, 'TIMESTAMP');
  changes.push('✓ 转换数据类型 (tinyint→SMALLINT, int→SERIAL等)');

  // 4. 移除UNSIGNED
  pgSQL = pgSQL.replace(/\s+UNSIGNED/gi, '');
  changes.push('✓ 移除UNSIGNED关键字');

  // 5. 移除AUTO_INCREMENT（已用SERIAL处理）
  pgSQL = pgSQL.replace(/\s+AUTO_INCREMENT/gi, '');
  changes.push('✓ 移除AUTO_INCREMENT（使用PostgreSQL SERIAL）');

  // 6. 移除MySQL特定引擎和字符集设置
  pgSQL = pgSQL.replace(/\s+ENGINE\s*=\s*\w+/gi, '');
  pgSQL = pgSQL.replace(/\s+DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
  pgSQL = pgSQL.replace(/\s+COLLATE\s*=\s*[\w_]+/gi, '');
  changes.push('✓ 移除ENGINE/DEFAULT CHARSET/COLLATE设置');

  // 7. 转换时间戳函数
  pgSQL = pgSQL.replace(/DEFAULT\s+NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
  pgSQL = pgSQL.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');
  changes.push('✓ 转换时间戳函数和ON UPDATE');

  // 8. 移除TiDB特定语法
  pgSQL = pgSQL.replace(/\/\*T!\[[^\]]+\]\s*[^*]*\*\//gi, '');
  changes.push('✓ 移除TiDB特定语法标记');

  // 9. 转换LOCK/UNLOCK TABLES为事务
  pgSQL = pgSQL.replace(/LOCK\s+TABLES\s+[^;]+;/gi, 'BEGIN;');
  pgSQL = pgSQL.replace(/UNLOCK\s+TABLES;/gi, 'COMMIT;');
  changes.push('✓ 转换LOCK/UNLOCK TABLES为事务');

  // 10. 转换INSERT IGNORE
  pgSQL = pgSQL.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  changes.push('✓ 转换INSERT IGNORE为INSERT');

  // 11. 移除DISABLE/ENABLE KEYS
  pgSQL = pgSQL.replace(/ALTER\s+TABLE\s+"[^"]+"\s+DISABLE\s+KEYS;?/gi, '');
  pgSQL = pgSQL.replace(/ALTER\s+TABLE\s+"[^"]+"\s+ENABLE\s+KEYS;?/gi, '');
  changes.push('✓ 移除DISABLE/ENABLE KEYS');

  // 12. 转换索引定义
  pgSQL = pgSQL.replace(/UNIQUE\s+KEY\s+"?[^"]+"?/gi, 'UNIQUE');
  pgSQL = pgSQL.replace(/KEY\s+"?[^"]+"?\s*\(/gi, 'INDEX (');
  changes.push('✓ 转换索引定义');

  // 13. 移除空行和多余空格
  pgSQL = pgSQL.replace(/\n{3,}/g, '\n\n');

  console.log('转换详情:');
  changes.forEach(c => console.log('  ' + c));
  console.log('');

  return pgSQL;
}

/**
 * 提取关键表信息
 */
function analyzeSQL(sql) {
  console.log('📊 分析SQL文件内容:\n');

  // 提取表名
  const tableMatches = sql.match(/CREATE\s+TABLE\s+`([^`]+)`/gi) || [];
  const tables = tableMatches.map(m => m.match(/CREATE\s+TABLE\s+`([^`]+)`/i)[1]);

  console.log(`找到 ${tables.length} 个表:`);
  tables.forEach(t => console.log('  - ' + t));
  console.log('');

  // 估算INSERT语句数量
  const insertMatches = sql.match(/INSERT\s+INTO/gi) || [];
  console.log(`INSERT语句: ${insertMatches.length} 条\n`);

  return { tables, insertCount: insertMatches.length };
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 MySQL/TiDB 到 PostgreSQL SQL转换工具');
  console.log('=========================================\n');

  // 检查文件
  if (!fs.existsSync(CONFIG.mysqlDumpFile)) {
    console.error(`❌ 找不到MySQL备份文件: ${CONFIG.mysqlDumpFile}`);
    console.error('');
    console.error('请确保备份文件已放在项目根目录');
    process.exit(1);
  }

  const stats = fs.statSync(CONFIG.mysqlDumpFile);
  console.log(`📁 找到备份文件: ${CONFIG.mysqlDumpFile}`);
  console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

  // 读取SQL
  console.log('📖 读取SQL文件...');
  const mysqlSQL = fs.readFileSync(CONFIG.mysqlDumpFile, 'utf-8');

  // 分析SQL
  analyzeSQL(mysqlSQL);

  // 转换
  const pgSQL = convertMySQLToPostgreSQL(mysqlSQL);

  // 保存
  fs.writeFileSync(CONFIG.outputFile, pgSQL);

  const outputStats = fs.statSync(CONFIG.outputFile);
  console.log('✅ 转换完成！\n');
  console.log(`💾 输出文件: ${CONFIG.outputFile}`);
  console.log(`📊 输出大小: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB\n`);

  console.log('📋 下一步操作:');
  console.log('');
  console.log('方式1 - 使用psql命令行导入:');
  console.log('  psql -h your_host -U your_user -d your_db -f zesai_converted_postgres.sql');
  console.log('');
  console.log('方式2 - 使用数据库管理工具:');
  console.log('  - pgAdmin: 打开Query Tool，导入SQL文件');
  console.log('  - DBeaver: 打开SQL编辑器，执行脚本');
  console.log('  - TablePlus: 打开SQL窗口，导入文件');
  console.log('');
  console.log('方式3 - 使用Neon/Railway控制台:');
  console.log('  - 登录控制台');
  console.log('  - 找到SQL Editor或Query工具');
  console.log('  - 上传并执行SQL文件');
  console.log('');
  console.log('⚠️  注意事项:');
  console.log('  1. 导入前请确保PostgreSQL数据库已创建');
  console.log('  2. 如果导入失败，可以尝试分批执行（按表分割）');
  console.log('  3. 大表（messages, conversations）可能需要更长时间');
  console.log('  4. 导入完成后请验证数据完整性');
  console.log('');
}

// 运行
main();
