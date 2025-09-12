const mysql = require('mysql2/promise');
const config = require('../config/database');

async function debugDishesQuery() {
  const connection = await mysql.createConnection(config.database);
  
  try {
    console.log('=== 调试菜品查询 ===');
    
    const page = 1;
    const pageSize = 12;
    const filters = {};
    
    console.log('参数值:');
    console.log('  page:', page, '类型:', typeof page);
    console.log('  pageSize:', pageSize, '类型:', typeof pageSize);
    console.log('  filters:', filters);
    
    let whereClause = 'WHERE d.status != "deleted"';
    const params = [];
    
    if (filters.keyword) {
      whereClause += ' AND d.name LIKE ?';
      params.push(`%${filters.keyword}%`);
    }
    
    if (filters.categoryId) {
      whereClause += ' AND d.categoryId = ?';
      params.push(filters.categoryId);
    }
    
    if (filters.status) {
      whereClause += ' AND d.status = ?';
      params.push(filters.status);
    }
    
    console.log('\nWHERE子句:', whereClause);
    console.log('WHERE参数:', params);
    
    // 获取总数
    console.log('\n1. 执行COUNT查询...');
    const countSQL = `SELECT COUNT(*) as total FROM dishes d ${whereClause}`;
    console.log('COUNT SQL:', countSQL);
    console.log('COUNT参数:', params);
    
    const [countResult] = await connection.execute(countSQL, params);
    const total = countResult[0].total;
    console.log('✅ COUNT查询成功，总数:', total);
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    console.log('\n2. 执行分页查询...');
    console.log('  offset:', offset, '类型:', typeof offset);
    console.log('  pageSize:', pageSize, '类型:', typeof pageSize);
    
    const dishesSQL = `SELECT d.*, dc.name as category_name 
       FROM dishes d 
       LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
       ${whereClause} 
       ORDER BY d.createTime DESC 
       LIMIT ? OFFSET ?`;
    
    const finalParams = [...params, parseInt(pageSize), parseInt(offset)];
    
    console.log('分页SQL:', dishesSQL);
    console.log('分页参数:', finalParams);
    console.log('参数类型:', finalParams.map(p => typeof p));
    
    const [dishes] = await connection.execute(dishesSQL, finalParams);
    console.log('✅ 分页查询成功，菜品数量:', dishes.length);
    
    if (dishes.length > 0) {
      console.log('第一个菜品:', dishes[0]);
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await connection.end();
  }
}

// 运行调试
debugDishesQuery();
