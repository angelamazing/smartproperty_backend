const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkExistingTables() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查所有表
    const [tables] = await connection.execute(`
      SHOW TABLES
    `);
    
    console.log('\n📋 数据库中的所有表:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${Object.values(table)[0]}`);
    });
    
    // 检查roles表结构
    console.log('\n🔍 检查roles表结构...');
    try {
      const [columns] = await connection.execute(`
        DESCRIBE roles
      `);
      
      console.log('\n📋 roles表结构:');
      console.table(columns);
      
      // 检查是否有数据
      const [rows] = await connection.execute(`
        SELECT * FROM roles LIMIT 3
      `);
      
      if (rows.length > 0) {
        console.log('\n📊 roles表数据示例:');
        console.table(rows);
      } else {
        console.log('\n📊 roles表为空');
      }
      
    } catch (error) {
      console.log('❌ roles表不存在或无法访问:', error.message);
    }
    
    // 检查dishes表结构
    console.log('\n🔍 检查dishes表结构...');
    try {
      const [columns] = await connection.execute(`
        DESCRIBE dishes
      `);
      
      console.log('\n📋 dishes表结构:');
      console.table(columns);
      
    } catch (error) {
      console.log('❌ dishes表不存在或无法访问:', error.message);
    }
    
    // 检查dish_categories表结构
    console.log('\n🔍 检查dish_categories表结构...');
    try {
      const [columns] = await connection.execute(`
        DESCRIBE dish_categories
      `);
      
      console.log('\n📋 dish_categories表结构:');
      console.table(columns);
      
    } catch (error) {
      console.log('❌ dish_categories表不存在或无法访问:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
checkExistingTables();
