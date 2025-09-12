const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
const config = require('./config/database');

// 创建简单的测试服务器
const testApp = express();
testApp.use(express.json());

// 数据库连接中间件
testApp.use(async (req, res, next) => {
  try {
    if (!req.db) {
      req.db = mysql.createPool(config.database);
    }
    next();
  } catch (error) {
    res.status(500).json({ error: '数据库连接失败' });
  }
});

// 测试路由 - 完全不需要认证
testApp.get('/test/dishes', async (req, res) => {
  try {
    console.log('收到请求:', req.method, req.path);
    console.log('查询参数:', req.query);
    
    const { pageSize = 20, status } = req.query;
    
    // 构建查询条件
    let whereClause = 'WHERE d.status != "deleted"';
    const queryParams = [];
    
    if (status) {
      whereClause += ' AND d.status = ?';
      queryParams.push(status);
    }
    
    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM dishes d 
      ${whereClause}
    `;
    
    const [countResult] = await req.db.execute(countSql, queryParams);
    const total = parseInt(countResult[0].total);
    
    // 查询菜品列表
    const listSql = `
      SELECT 
        d._id,
        d.name,
        d.description,
        d.price,
        d.categoryId,
        d.status
      FROM dishes d
      ${whereClause}
      ORDER BY d._id DESC
      LIMIT ${pageSize}
    `;
    
    const [dishes] = await req.db.execute(listSql, queryParams);
    
    res.json({
      success: true,
      message: '获取菜品列表成功',
      data: {
        list: dishes,
        pagination: {
          total,
          pageSize: parseInt(pageSize)
        }
      }
    });
    
  } catch (error) {
    console.error('查询失败:', error);
    res.status(500).json({
      success: false,
      message: '获取菜品列表失败',
      error: error.message
    });
  }
});

// 启动测试服务器
const testServer = testApp.listen(3001, () => {
  console.log('🧪 测试服务器启动在端口 3001');
  
  // 测试查询
  testQuery();
});

async function testQuery() {
  try {
    console.log('\n📋 测试数据库查询...');
    
    // 创建数据库连接
    const db = mysql.createPool(config.database);
    
    // 测试查询
    const [rows] = await db.execute('SELECT COUNT(*) as total FROM dishes WHERE status != "deleted"');
    console.log('✅ 数据库查询成功，总数:', rows[0].total);
    
    await db.end();
    
  } catch (error) {
    console.error('❌ 数据库查询失败:', error.message);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🔌 关闭测试服务器...');
  testServer.close(() => {
    console.log('测试服务器已关闭');
    process.exit(0);
  });
});
