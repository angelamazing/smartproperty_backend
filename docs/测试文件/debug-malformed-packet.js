const mysql = require('mysql2/promise');
const config = require('./config/database');

async function debugMalformedPacket() {
  let connection;
  
  try {
    console.log('🔍 诊断Malformed communication packet错误...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试1: 最简单的查询
    console.log('\n📋 测试1: 最简单的查询');
    try {
      const [rows] = await connection.execute('SELECT 1 as test');
      console.log('✅ 简单查询成功:', rows[0]);
    } catch (error) {
      console.log('❌ 简单查询失败:', error.message);
      return;
    }
    
    // 测试2: 检查dishes表数据
    console.log('\n📋 测试2: 检查dishes表数据');
    try {
      const [rows] = await connection.execute('SELECT _id, name, status FROM dishes LIMIT 3');
      console.log('✅ dishes表查询成功，记录数:', rows.length);
      console.log('第一条记录:', rows[0]);
    } catch (error) {
      console.log('❌ dishes表查询失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试3: 检查dish_categories表数据
    console.log('\n📋 测试3: 检查dish_categories表数据');
    try {
      const [rows] = await connection.execute('SELECT _id, name FROM dish_categories LIMIT 3');
      console.log('✅ dish_categories表查询成功，记录数:', rows.length);
      if (rows.length > 0) {
        console.log('第一条记录:', rows[0]);
      }
    } catch (error) {
      console.log('❌ dish_categories表查询失败:', error.message);
    }
    
    // 测试4: 测试JOIN查询（简化版）
    console.log('\n📋 测试4: 测试JOIN查询（简化版）');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.status
        FROM dishes d
        WHERE d.status != 'deleted'
        LIMIT 3
      `);
      console.log('✅ 简化JOIN查询成功，记录数:', rows.length);
    } catch (error) {
      console.log('❌ 简化JOIN查询失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试5: 测试COALESCE函数
    console.log('\n📋 测试5: 测试COALESCE函数');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          COALESCE(d.image, '') as image
        FROM dishes d
        LIMIT 3
      `);
      console.log('✅ COALESCE查询成功，记录数:', rows.length);
    } catch (error) {
      console.log('❌ COALESCE查询失败:', error.message);
    }
    
    // 测试6: 测试JSON字段
    console.log('\n📋 测试6: 测试JSON字段');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          _id,
          name,
          tags
        FROM dishes 
        WHERE tags IS NOT NULL
        LIMIT 3
      `);
      console.log('✅ JSON字段查询成功，记录数:', rows.length);
      if (rows.length > 0) {
        console.log('第一条记录的tags:', rows[0].tags);
        console.log('tags类型:', typeof rows[0].tags);
      }
    } catch (error) {
      console.log('❌ JSON字段查询失败:', error.message);
    }
    
    // 测试7: 测试完整的查询逻辑
    console.log('\n📋 测试7: 测试完整的查询逻辑');
    try {
      // 先测试计数查询
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total 
        FROM dishes d 
        WHERE d.status != 'deleted'
      `);
      const total = parseInt(countResult[0].total);
      console.log('✅ 计数查询成功，总数:', total);
      
      // 再测试列表查询
      const [dishes] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.description,
          d.price,
          d.categoryId,
          d.status
        FROM dishes d
        WHERE d.status != 'deleted'
        ORDER BY d._id DESC
        LIMIT 5
      `);
      console.log('✅ 列表查询成功，记录数:', dishes.length);
      
    } catch (error) {
      console.log('❌ 完整查询逻辑失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    console.log('\n🎉 诊断完成！');
    
  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行诊断
debugMalformedPacket();
