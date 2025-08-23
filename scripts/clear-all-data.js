/**
 * 数据库隐私数据清理脚本
 * 警告：此脚本将删除所有用户数据、导航项和登录记录
 * 执行前请确保已备份重要数据
 */

const { Pool } = require('pg')
const dotenv = require('dotenv')
const readline = require('readline')

dotenv.config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function clearAllData() {
  console.log('🚨 数据库隐私数据清理工具')
  console.log('⚠️  警告：此操作将永久删除以下数据：')
  console.log('   - 所有用户账户和密码')
  console.log('   - 所有导航项目')
  console.log('   - 所有登录记录')
  console.log('   - 所有历史数据')
  console.log('')
  
  return new Promise((resolve) => {
    rl.question('确认要继续吗？请输入 "CONFIRM" 来确认清理操作: ', async (answer) => {
      if (answer !== 'CONFIRM') {
        console.log('❌ 操作已取消')
        rl.close()
        process.exit(0)
      }
      
      try {
        const connectionString = process.env.DATABASE_URL
        if (!connectionString) {
          throw new Error('未找到 DATABASE_URL 环境变量')
        }
        
        console.log('🔗 连接到数据库...')
        const pool = new Pool({ connectionString })
        
        // 测试连接
        await pool.query('SELECT 1')
        console.log('✅ 数据库连接成功')
        
        console.log('🧹 开始清理数据...')
        
        // 清空所有表
        await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
        console.log('✅ 用户数据已清理')
        
        await pool.query('TRUNCATE TABLE nav_items RESTART IDENTITY CASCADE')
        console.log('✅ 导航项数据已清理')
        
        await pool.query('TRUNCATE TABLE login_attempts RESTART IDENTITY CASCADE')
        console.log('✅ 登录记录已清理')
        
        // 验证清理结果
        const result = await pool.query(`
          SELECT 'users' as table_name, COUNT(*) as record_count FROM users
          UNION ALL
          SELECT 'nav_items' as table_name, COUNT(*) as record_count FROM nav_items
          UNION ALL
          SELECT 'login_attempts' as table_name, COUNT(*) as record_count FROM login_attempts
        `)
        
        console.log('\n📊 清理结果验证：')
        result.rows.forEach(row => {
          console.log(`   ${row.table_name}: ${row.record_count} 条记录`)
        })
        
        await pool.end()
        
        console.log('\n🎉 数据库隐私数据清理完成！')
        console.log('💡 提示：')
        console.log('   - 所有用户账户已删除，需要重新创建管理员账户')
        console.log('   - 所有导航项已删除，可以重新添加')
        console.log('   - 所有历史记录已删除，无法恢复')
        console.log('   - 请重新运行应用程序以创建新的管理员账户')
        
      } catch (error) {
        console.error('❌ 清理失败:', error.message)
        process.exit(1)
      } finally {
        rl.close()
        process.exit(0)
      }
    })
  })
}

clearAllData()