const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testDbConnectionIssue() {
  let pool;
  
  try {
    console.log('🔍 测试数据库连接问题...');
    
    // 创建连接池（模拟server.js中的配置）
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 检查连接池状态
    console.log('\n📋 测试1: 检查连接池状态');
    try {
      const connection = await pool.getConnection();
      console.log('✅ 获取连接成功');
      
      // 测试ping
      await connection.ping();
      console.log('✅ 连接ping成功');
      
      connection.release();
      console.log('✅ 连接释放成功');
    } catch (error) {
      console.log('❌ 连接池测试失败:', error.message);
      return;
    }
    
    // 测试2: 模拟dishService的getDishList方法
    console.log('\n📋 测试2: 模拟dishService的getDishList方法');
    try {
      // 模拟参数
      const params = {
        pageSize: 100,
        status: 'active'
      };
      
      const { page = 1, pageSize = 20, size = pageSize } = params;
      const offset = (page - 1) * size;
      
      console.log('处理后的参数:', { page, pageSize, size, offset });
      
      // 构建查询条件
      const whereClause = 'WHERE d.status != "deleted" AND d.status = "active"';
      const queryParams = ['active'];
      
      console.log('WHERE子句:', whereClause);
      console.log('查询参数:', queryParams);
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM dishes d 
        ${whereClause}
      `;
      
      console.log('计数SQL:', countSql);
      
      // 使用连接池的execute方法
      const [countResult] = await pool.execute(countSql, queryParams);
      const total = parseInt(countResult[0].total);
      console.log('✅ 计数查询成功，总数:', total);
      
      // 查询菜品列表
      const listSql = `
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
        ${whereClause}
        ORDER BY d._id DESC
        LIMIT ${size} OFFSET ${offset}
      `;
      
      console.log('列表SQL:', listSql);
      
      const [dishes] = await pool.execute(listSql, queryParams);
      console.log('✅ 列表查询成功，记录数:', dishes.length);
      
      // 处理数据
      const processedDishes = dishes.map(dish => {
        try {
          return {
            ...dish,
            tags: dish.tags ? JSON.parse(dish.tags) : []
          };
        } catch (parseError) {
          console.warn('解析菜品tags失败:', parseError.message, '原始数据:', dish.tags);
          return {
            ...dish,
            tags: []
          };
        }
      });
      
      console.log('✅ 数据处理成功，处理后的记录数:', processedDishes.length);
      
      const result = {
        list: processedDishes,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size)
        }
      };
      
      console.log('✅ 方法执行成功');
      console.log('返回结果:', {
        listLength: result.list.length,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.log('❌ 模拟dishService失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试3: 测试连接池的稳定性
    console.log('\n📋 测试3: 测试连接池的稳定性');
    try {
      // 连续执行多次查询
      for (let i = 0; i < 3; i++) {
        const [rows] = await pool.execute('SELECT COUNT(*) as total FROM dishes');
        console.log(`第${i + 1}次查询成功，总数:`, rows[0].total);
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('✅ 连接池稳定性测试成功');
    } catch (error) {
      console.log('❌ 连接池稳定性测试失败:', error.message);
    }
    
    console.log('\n🎉 测试完成！');
    
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
testDbConnectionIssue();
