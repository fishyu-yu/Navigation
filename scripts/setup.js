#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

console.log('🚀 PostgreSQL 导航系统配置向导\n');

// 生成安全的会话密钥
const sessionSecret = crypto.randomBytes(32).toString('hex');

// 读取现有的 .env 文件或创建新的
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📝 发现现有 .env 文件，将更新配置...');
} else {
  console.log('📝 创建新的 .env 配置文件...');
}

// 更新或设置 SESSION_SECRET
if (envContent.includes('SESSION_SECRET=')) {
  if (envContent.includes('SESSION_SECRET=please_change_this_to_random_32_chars')) {
    envContent = envContent.replace(
      /SESSION_SECRET=please_change_this_to_random_32_chars/,
      `SESSION_SECRET=${sessionSecret}`
    );
    console.log('🔐 已生成新的会话密钥');
  } else {
    console.log('🔐 保留现有会话密钥');
  }
} else {
  envContent += `\nSESSION_SECRET=${sessionSecret}\n`;
  console.log('🔐 已添加会话密钥');
}

// 写入 .env 文件
fs.writeFileSync(envPath, envContent);

console.log('\n✅ 配置完成！\n');
console.log('📋 接下来的步骤：');
console.log('1. 安装并启动 PostgreSQL 服务');
console.log('2. 创建数据库: createdb -U postgres navigation');
console.log('3. 执行初始化脚本: psql -U postgres -d navigation -f init-db.sql');
console.log('4. 修改 .env 文件中的数据库连接信息');
console.log('5. 运行应用: npm start');
console.log('\n📖 详细说明请参考 README-PostgreSQL.md\n');

// 显示当前配置
console.log('📄 当前 .env 配置预览：');
console.log('─'.repeat(50));
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
lines.forEach(line => {
  if (line.includes('PASSWORD') || line.includes('SECRET')) {
    const [key] = line.split('=');
    console.log(`${key}=***`);
  } else {
    console.log(line);
  }
});
console.log('─'.repeat(50));