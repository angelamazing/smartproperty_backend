const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkMenuTableStructure() {
  let pool;
  
  try {
    console.log('🔍 检查menus表结构...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 检查表是否存在
    console.log('\n📋 检查menus表是否存在');
    const [tables] = await pool.execute('SHOW TABLES LIKE "menus"');
    
    if (tables.length === 0) {
      console.log('❌ menus表不存在');
      return;
    }
    
    console.log('✅ menus表存在');
    
    // 检查表结构
    console.log('\n📋 检查menus表结构');
    const [columns] = await pool.execute('DESCRIBE menus');
    
    console.log('menus表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // 检查是否有数据
    console.log('\n📋 检查menus表数据');
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM menus');
    console.log(`总记录数: ${countResult[0].total}`);
    
    if (countResult[0].total > 0) {
      const [sampleData] = await pool.execute('SELECT * FROM menus LIMIT 1');
      console.log('\n示例数据:');
      console.log(JSON.stringify(sampleData[0], null, 2));
    }
    
    // 检查users表结构（用于JOIN）
    console.log('\n📋 检查users表结构');
    const [userTables] = await pool.execute('SHOW TABLES LIKE "users"');
    
    if (userTables.length > 0) {
      const [userColumns] = await pool.execute('DESCRIBE users');
      console.log('users表字段:');
      userColumns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      console.log('⚠️ users表不存在');
    }
    
    console.log('\n🎉 表结构检查完成！');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 连接池已关闭');
    }
  }
}

// 运行检查
checkMenuTableStructure();
