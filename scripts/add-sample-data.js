const { db } = require('./src/db');

async function addSampleData() {
  console.log('🚀 添加示例导航数据...');
  
  try {
    await db.init();
    
    const sampleItems = [
      { label: 'Google', url: 'https://www.google.com', order_index: 1 },
      { label: 'GitHub', url: 'https://github.com', order_index: 2 },
      { label: 'Stack Overflow', url: 'https://stackoverflow.com', order_index: 3 },
      { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', order_index: 4 },
      { label: 'Vue.js 官网', url: 'https://vuejs.org', order_index: 5 },
      { label: 'React 官网', url: 'https://reactjs.org', order_index: 6 },
      { label: 'Node.js 官网', url: 'https://nodejs.org', order_index: 7 },
      { label: 'npm 官网', url: 'https://www.npmjs.com', order_index: 8 }
    ];
    
    for (const item of sampleItems) {
      try {
        await db.createNavItem(item);
        console.log(`✅ 已添加: ${item.label}`);
      } catch (e) {
        if (e.message.includes('duplicate') || e.code === '23505') {
          console.log(`⚠️  跳过重复项: ${item.label}`);
        } else {
          console.log(`❌ 添加失败: ${item.label} - ${e.message}`);
        }
      }
    }
    
    console.log('\n🔍 开始检测所有网站状态...');
    await db.checkAllStatuses();
    console.log('✅ 状态检测完成！');
    
    const items = await db.getNavItems();
    console.log(`\n📊 当前共有 ${items.length} 个导航项目`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

addSampleData();