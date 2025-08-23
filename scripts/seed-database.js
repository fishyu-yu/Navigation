const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function seedDatabase() {
  console.log('🌱 开始向 PostgreSQL 数据库添加示例数据...');
  
  let pool;
  try {
    // 使用环境变量中的数据库连接
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('未找到 DATABASE_URL 环境变量');
    }
    
    console.log('🔗 连接到数据库...');
    pool = new Pool({ 
      connectionString,
      connectionTimeoutMillis: 5000 
    });
    
    // 测试连接
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功！');
    
    // 示例导航数据
    const sampleItems = [
      { label: 'Google', url: 'https://www.google.com', order_index: 1 },
      { label: 'GitHub', url: 'https://github.com', order_index: 2 },
      { label: 'Stack Overflow', url: 'https://stackoverflow.com', order_index: 3 },
      { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', order_index: 4 },
      { label: 'Vue.js 官网', url: 'https://vuejs.org', order_index: 5 },
      { label: 'React 官网', url: 'https://reactjs.org', order_index: 6 },
      { label: 'Node.js 官网', url: 'https://nodejs.org', order_index: 7 },
      { label: 'npm 官网', url: 'https://www.npmjs.com', order_index: 8 },
      { label: 'TypeScript 官网', url: 'https://www.typescriptlang.org', order_index: 9 },
      { label: 'Express.js', url: 'https://expressjs.com', order_index: 10 }
    ];
    
    console.log('📝 添加导航项目...');
    
    for (const item of sampleItems) {
      try {
        const result = await pool.query(
          'INSERT INTO nav_items (label, url, order_index) VALUES ($1, $2, $3) RETURNING id',
          [item.label, item.url, item.order_index]
        );
        console.log(`✅ 已添加: ${item.label} (ID: ${result.rows[0].id})`);
      } catch (e) {
        if (e.code === '23505') { // 唯一约束冲突
          console.log(`⚠️  跳过重复项: ${item.label}`);
        } else {
          console.log(`❌ 添加失败: ${item.label} - ${e.message}`);
        }
      }
    }
    
    // 查询最终结果
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM nav_items');
    console.log(`\n📊 数据库中现有 ${rows[0].count} 个导航项目`);
    
    console.log('\n🎉 示例数据添加完成！');
    console.log('💡 现在可以访问 http://localhost:3000 查看导航页面');
    console.log('🔑 管理员登录: http://localhost:3000/login (用户名: admin)');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

seedDatabase();