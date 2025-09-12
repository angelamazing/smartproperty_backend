const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testMinimalDishes() {
  let connection;
  
  try {
    console.log('🧪 测试最简单的菜品查询...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试最简单的查询
    console.log('\n📋 测试1: 最简单的查询');
    try {
      const [rows] = await connection.execute('SELECT 1 as test');
      console.log('✅ 基础查询成功:', rows[0]);
    } catch (error) {
      console.log('❌ 基础查询失败:', error.message);
      return;
    }
    
    // 测试dishes表是否存在
    console.log('\n📋 测试2: 检查dishes表');
    try {
      const [rows] = await connection.execute('SHOW TABLES LIKE "dishes"');
      if (rows.length > 0) {
        console.log('✅ dishes表存在');
      } else {
        console.log('❌ dishes表不存在');
        return;
      }
    } catch (error) {
      console.log('❌ 检查dishes表失败:', error.message);
      return;
    }
    
    // 测试dishes表结构
    console.log('\n📋 测试3: 检查dishes表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dishes');
      console.log('dishes表字段数量:', columns.length);
      
      // 只显示前5个字段
      const firstFields = columns.slice(0, 5).map(col => col.Field);
      console.log('前5个字段:', firstFields);
      
    } catch (error) {
      console.log('❌ 检查dishes表结构失败:', error.message);
      return;
    }
    
    // 测试最简单的dishes查询
    console.log('\n📋 测试4: 最简单的dishes查询');
    try {
      const [rows] = await connection.execute('SELECT _id, name FROM dishes LIMIT 1');
      console.log('✅ dishes查询成功，返回记录数:', rows.length);
      
      if (rows.length > 0) {
        console.log('第一条记录:', {
          id: rows[0]._id,
          name: rows[0].name
        });
      }
      
    } catch (error) {
      console.log('❌ dishes查询失败:', error.message);
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
testMinimalDishes();
