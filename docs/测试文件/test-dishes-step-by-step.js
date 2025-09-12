const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testDishesStepByStep() {
  let connection;
  
  try {
    console.log('🧪 逐步测试菜品接口...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 步骤1: 检查dishes表是否存在
    console.log('\n📋 步骤1: 检查dishes表');
    try {
      const [tables] = await connection.execute('SHOW TABLES LIKE "dishes"');
      if (tables.length === 0) {
        console.log('❌ dishes表不存在');
        return;
      }
      console.log('✅ dishes表存在');
    } catch (error) {
      console.log('❌ 检查dishes表失败:', error.message);
      return;
    }
    
    // 步骤2: 检查dishes表结构
    console.log('\n📋 步骤2: 检查dishes表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dishes');
      console.log('dishes表字段数量:', columns.length);
      
      // 显示所有字段
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
      
    } catch (error) {
      console.log('❌ 检查dishes表结构失败:', error.message);
      return;
    }
    
    // 步骤3: 检查dish_categories表
    console.log('\n📋 步骤3: 检查dish_categories表');
    try {
      const [tables] = await connection.execute('SHOW TABLES LIKE "dish_categories"');
      if (tables.length === 0) {
        console.log('❌ dish_categories表不存在');
        return;
      }
      console.log('✅ dish_categories表存在');
      
      const [columns] = await connection.execute('DESCRIBE dish_categories');
      console.log('dish_categories表字段数量:', columns.length);
      
    } catch (error) {
      console.log('❌ 检查dish_categories表失败:', error.message);
      return;
    }
    
    // 步骤4: 测试最简单的查询
    console.log('\n📋 步骤4: 测试最简单的查询');
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as total FROM dishes');
      console.log('✅ 简单查询成功，总数:', rows[0].total);
    } catch (error) {
      console.log('❌ 简单查询失败:', error.message);
      return;
    }
    
    // 步骤5: 测试带条件的查询
    console.log('\n📋 步骤5: 测试带条件的查询');
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as total FROM dishes WHERE status != "deleted"');
      console.log('✅ 条件查询成功，有效菜品数:', rows[0].total);
    } catch (error) {
      console.log('❌ 条件查询失败:', error.message);
      return;
    }
    
    // 步骤6: 测试JOIN查询
    console.log('\n📋 步骤6: 测试JOIN查询');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.description,
          d.price,
          d.categoryId,
          COALESCE(dc.name, '') as categoryName,
          d.status
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE d.status != 'deleted'
        LIMIT 3
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
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 步骤7: 测试分页查询
    console.log('\n📋 步骤7: 测试分页查询');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.description,
          d.price,
          d.categoryId,
          COALESCE(dc.name, '') as categoryName,
          d.status
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE d.status != 'deleted'
        ORDER BY d._id DESC
        LIMIT 10 OFFSET 0
      `);
      console.log('✅ 分页查询成功，返回记录数:', rows.length);
      
    } catch (error) {
      console.log('❌ 分页查询失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    console.log('\n🎉 逐步测试完成！');
    
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
testDishesStepByStep();
