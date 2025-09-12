const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testConnectionPool() {
  let pool;
  
  try {
    console.log('🧪 测试数据库连接池...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 使用连接池的execute方法
    console.log('\n📋 测试1: 使用连接池的execute方法');
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) as total FROM dishes');
      console.log('✅ 连接池execute成功，总数:', rows[0].total);
    } catch (error) {
      console.log('❌ 连接池execute失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试2: 使用连接池的query方法
    console.log('\n📋 测试2: 使用连接池的query方法');
    try {
      const [rows] = await pool.query('SELECT COUNT(*) as total FROM dishes');
      console.log('✅ 连接池query成功，总数:', rows[0].total);
    } catch (error) {
      console.log('❌ 连接池query失败:', error.message);
    }
    
    // 测试3: 获取连接后使用execute
    console.log('\n📋 测试3: 获取连接后使用execute');
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT COUNT(*) as total FROM dishes');
      console.log('✅ 获取连接后execute成功，总数:', rows[0].total);
      connection.release();
    } catch (error) {
      console.log('❌ 获取连接后execute失败:', error.message);
    }
    
    // 测试4: 测试复杂的JOIN查询
    console.log('\n📋 测试4: 测试复杂的JOIN查询');
    try {
      const [rows] = await pool.execute(`
        SELECT 
          d._id,
          d.name,
          d.description,
          d.price,
          d.categoryId,
          COALESCE(dc.name, '') as categoryName,
          COALESCE(d.image, '') as image,
          COALESCE(d.tags, '[]') as tags,
          d.status
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE d.status != 'deleted'
        ORDER BY d._id DESC
        LIMIT 5
      `);
      console.log('✅ 复杂JOIN查询成功，记录数:', rows.length);
    } catch (error) {
      console.log('❌ 复杂JOIN查询失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试5: 测试参数化查询
    console.log('\n📋 测试5: 测试参数化查询');
    try {
      const [rows] = await pool.execute(`
        SELECT COUNT(*) as total 
        FROM dishes d 
        WHERE d.status != 'deleted' AND d.status = ?
      `, ['active']);
      console.log('✅ 参数化查询成功，总数:', rows[0].total);
    } catch (error) {
      console.log('❌ 参数化查询失败:', error.message);
    }
    
    console.log('\n🎉 连接池测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 连接池已关闭');
    }
  }
}

// 运行测试
testConnectionPool();
