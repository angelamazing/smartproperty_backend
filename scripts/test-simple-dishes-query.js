const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testSimpleDishesQuery() {
  const connection = await mysql.createConnection(config.database);
  
  try {
    console.log('=== 测试简单菜品查询 ===');
    
    // 1. 测试基本查询（无JOIN）
    console.log('\n1. 测试基本查询（无JOIN）...');
    try {
      const [dishes] = await connection.execute(
        'SELECT * FROM dishes WHERE status != "deleted" ORDER BY createTime DESC LIMIT 5'
      );
      console.log('✅ 基本查询成功，菜品数量:', dishes.length);
      if (dishes.length > 0) {
        console.log('第一个菜品:', dishes[0]);
      }
    } catch (error) {
      console.error('❌ 基本查询失败:', error.message);
    }
    
    // 2. 测试带LIMIT的查询
    console.log('\n2. 测试带LIMIT的查询...');
    try {
      const [dishes] = await connection.execute(
        'SELECT * FROM dishes WHERE status != "deleted" ORDER BY createTime DESC LIMIT ?',
        [5]
      );
      console.log('✅ 带LIMIT查询成功，菜品数量:', dishes.length);
    } catch (error) {
      console.error('❌ 带LIMIT查询失败:', error.message);
    }
    
    // 3. 测试带OFFSET的查询
    console.log('\n3. 测试带OFFSET的查询...');
    try {
      const [dishes] = await connection.execute(
        'SELECT * FROM dishes WHERE status != "deleted" ORDER BY createTime DESC LIMIT ? OFFSET ?',
        [5, 0]
      );
      console.log('✅ 带OFFSET查询成功，菜品数量:', dishes.length);
    } catch (error) {
      console.error('❌ 带OFFSET查询失败:', error.message);
    }
    
    // 4. 测试JOIN查询（无LIMIT）
    console.log('\n4. 测试JOIN查询（无LIMIT）...');
    try {
      const [dishes] = await connection.execute(
        `SELECT d.*, dc.name as category_name 
         FROM dishes d 
         LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
         WHERE d.status != "deleted" 
         ORDER BY d.createTime DESC`
      );
      console.log('✅ JOIN查询成功，菜品数量:', dishes.length);
      if (dishes.length > 0) {
        console.log('第一个菜品:', dishes[0]);
      }
    } catch (error) {
      console.error('❌ JOIN查询失败:', error.message);
    }
    
    // 5. 测试完整的JOIN + LIMIT + OFFSET查询
    console.log('\n5. 测试完整的JOIN + LIMIT + OFFSET查询...');
    try {
      const [dishes] = await connection.execute(
        `SELECT d.*, dc.name as category_name 
         FROM dishes d 
         LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
         WHERE d.status != "deleted" 
         ORDER BY d.createTime DESC 
         LIMIT ? OFFSET ?`,
        [5, 0]
      );
      console.log('✅ 完整查询成功，菜品数量:', dishes.length);
    } catch (error) {
      console.error('❌ 完整查询失败:', error.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

// 运行测试
testSimpleDishesQuery();
