const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testDishesAPI() {
  let connection;
  
  try {
    console.log('🧪 测试菜品接口...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试1: 检查dishes表结构
    console.log('\n📋 检查dishes表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dishes');
      console.log('dishes表字段数量:', columns.length);
      
      // 显示关键字段
      const keyFields = columns.map(col => col.Field).filter(field => 
        ['_id', 'name', 'description', 'price', 'categoryId', 'status', 'tags'].includes(field)
      );
      console.log('关键字段:', keyFields);
      
    } catch (error) {
      console.log('❌ 检查dishes表失败:', error.message);
      return;
    }
    
    // 测试2: 简单查询dishes表
    console.log('\n📋 测试简单查询dishes表');
    try {
      const [rows] = await connection.execute(`
        SELECT COUNT(*) as total FROM dishes WHERE status != 'deleted'
      `);
      console.log('✅ 查询成功，菜品总数:', rows[0].total);
      
    } catch (error) {
      console.log('❌ 查询失败:', error.message);
    }
    
    // 测试3: 测试JOIN查询
    console.log('\n📋 测试JOIN查询');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.description,
          d.price,
          d.categoryId,
          dc.name as categoryName,
          d.status
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE d.status != 'deleted'
        LIMIT 5
      `);
      console.log('✅ JOIN查询成功，返回记录数:', rows.length);
      
      if (rows.length > 0) {
        console.log('第一条记录:', {
          id: rows[0]._id,
          name: rows[0].name,
          categoryName: rows[0].categoryName
        });
      }
      
    } catch (error) {
      console.log('❌ JOIN查询失败:', error.message);
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testDishesAPI();
