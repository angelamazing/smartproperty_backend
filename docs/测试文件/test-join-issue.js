const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testJoinIssue() {
  let connection;
  
  try {
    console.log('🔍 测试JOIN问题...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试1: 检查dishes表的categoryId
    console.log('\n📋 测试1: 检查dishes表的categoryId');
    try {
      const [rows] = await connection.execute(`
        SELECT _id, name, categoryId, status 
        FROM dishes 
        LIMIT 5
      `);
      console.log('dishes表数据:');
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row._id}, Name: ${row.name}, CategoryID: ${row.categoryId}, Status: ${row.status}`);
      });
    } catch (error) {
      console.log('❌ 查询dishes表失败:', error.message);
    }
    
    // 测试2: 检查dish_categories表
    console.log('\n📋 测试2: 检查dish_categories表');
    try {
      const [rows] = await connection.execute(`
        SELECT _id, name 
        FROM dish_categories 
        LIMIT 5
      `);
      console.log('dish_categories表数据:');
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row._id}, Name: ${row.name}`);
      });
    } catch (error) {
      console.log('❌ 查询dish_categories表失败:', error.message);
    }
    
    // 测试3: 测试JOIN查询
    console.log('\n📋 测试3: 测试JOIN查询');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.categoryId,
          COALESCE(dc.name, '') as categoryName
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE d.status != 'deleted'
        LIMIT 5
      `);
      console.log('JOIN查询结果:');
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row._id}, Name: ${row.name}, CategoryID: ${row.categoryId}, CategoryName: ${row.categoryName}`);
      });
    } catch (error) {
      console.log('❌ JOIN查询失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试4: 测试完整的查询（模拟dishService）
    console.log('\n📋 测试4: 测试完整的查询（模拟dishService）');
    try {
      // 构建查询条件
      const whereClause = 'WHERE d.status != "deleted" AND d.status = "active"';
      const queryParams = ['active'];
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM dishes d 
        ${whereClause}
      `;
      
      const [countResult] = await connection.execute(countSql, queryParams);
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
        LIMIT 100 OFFSET 0
      `;
      
      const [dishes] = await connection.execute(listSql, queryParams);
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
      
      if (processedDishes.length > 0) {
        console.log('第一条记录示例:', {
          id: processedDishes[0]._id,
          name: processedDishes[0].name,
          categoryName: processedDishes[0].categoryName,
          tags: processedDishes[0].tags
        });
      }
      
    } catch (error) {
      console.log('❌ 完整查询失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
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
testJoinIssue();
