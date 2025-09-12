const mysql = require('mysql2/promise');
const config = require('./config/database');

// 模拟dishService的getDishList方法
async function testGetDishList(db, params) {
  try {
    console.log('🧪 测试修复后的getDishList方法...');
    console.log('输入参数:', params);
    
    const { page = 1, pageSize = 20, size = pageSize, categoryId, keyword, status, minPrice, maxPrice } = params;
    const offset = (page - 1) * size;
    
    console.log('处理后的参数:', { page, pageSize, size, offset, categoryId, keyword, status, minPrice, maxPrice });
    
    // 构建查询条件
    let whereClause = 'WHERE d.status != "deleted"';
    const queryParams = [];
    
    if (categoryId) {
      whereClause += ' AND d.categoryId = ?';
      queryParams.push(categoryId);
    }
    
    if (status) {
      whereClause += ' AND d.status = ?';
      queryParams.push(status);
    }
    
    if (keyword) {
      whereClause += ' AND (d.name LIKE ? OR d.description LIKE ?)';
      const keywordParam = `%${keyword}%`;
      queryParams.push(keywordParam, keywordParam);
    }
    
    if (minPrice !== undefined) {
      whereClause += ' AND d.price >= ?';
      queryParams.push(minPrice);
    }
    
    if (maxPrice !== undefined) {
      whereClause += ' AND d.price <= ?';
      queryParams.push(maxPrice);
    }
    
    console.log('WHERE子句:', whereClause);
    console.log('查询参数:', queryParams);
    
    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM dishes d 
      ${whereClause}
    `;
    
    console.log('计数SQL:', countSql);
    const [countResult] = await db.execute(countSql, queryParams);
    const total = parseInt(countResult[0].total);
    console.log('总数查询结果:', total);
    
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
      LIMIT ? OFFSET ?
    `;
    
    console.log('列表SQL:', listSql);
    console.log('最终参数:', [...queryParams, size, offset]);
    
    // MySQL2不支持LIMIT子句的参数绑定，使用字符串插值
    const finalSql = listSql.replace('LIMIT ? OFFSET ?', `LIMIT ${size} OFFSET ${offset}`);
    const [dishes] = await db.execute(finalSql, queryParams);
    console.log('查询结果数量:', dishes.length);
    
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
    
    return result;
    
  } catch (error) {
    console.error('❌ 方法执行失败:', error.message);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    throw error;
  }
}

async function testFixedAPI() {
  let connection;
  
  try {
    console.log('🚀 测试修复后的菜品接口...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试1: 使用前端传递的参数格式
    console.log('\n📋 测试1: 前端参数格式');
    const frontendParams = {
      pageSize: 100,
      status: 'active'
    };
    
    try {
      const result = await testGetDishList(connection, frontendParams);
      console.log('✅ 前端参数测试成功');
    } catch (error) {
      console.log('❌ 前端参数测试失败:', error.message);
    }
    
    // 测试2: 使用标准参数格式
    console.log('\n📋 测试2: 标准参数格式');
    const standardParams = {
      page: 1,
      size: 20,
      status: 'active'
    };
    
    try {
      const result = await testGetDishList(connection, standardParams);
      console.log('✅ 标准参数测试成功');
    } catch (error) {
      console.log('❌ 标准参数测试失败:', error.message);
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
testFixedAPI();
