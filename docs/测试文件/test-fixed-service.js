const mysql = require('mysql2/promise');
const config = require('./config/database');
const dishService = require('./services/dishService');

async function testFixedService() {
  let pool;
  
  try {
    console.log('🧪 测试修复后的dishService...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 获取菜品列表（前端参数格式）
    console.log('\n📋 测试1: 获取菜品列表（前端参数格式）');
    try {
      const params = {
        pageSize: 100,
        status: 'active'
      };
      
      const result = await dishService.getDishList(pool, params);
      console.log('✅ 获取菜品列表成功');
      console.log('返回数据:', {
        listLength: result.list.length,
        pagination: result.pagination
      });
      
      if (result.list.length > 0) {
        console.log('第一条菜品:', {
          id: result.list[0]._id,
          name: result.list[0].name,
          categoryName: result.list[0].categoryName,
          tags: result.list[0].tags
        });
      }
      
    } catch (error) {
      console.log('❌ 获取菜品列表失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试2: 获取菜品列表（标准参数格式）
    console.log('\n📋 测试2: 获取菜品列表（标准参数格式）');
    try {
      const params = {
        page: 1,
        size: 20,
        status: 'active'
      };
      
      const result = await dishService.getDishList(pool, params);
      console.log('✅ 获取菜品列表成功');
      console.log('返回数据:', {
        listLength: result.list.length,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.log('❌ 获取菜品列表失败:', error.message);
    }
    
    // 测试3: 获取菜品分类
    console.log('\n📋 测试3: 获取菜品分类');
    try {
      const categories = await dishService.getDishCategories(pool);
      console.log('✅ 获取菜品分类成功，数量:', categories.length);
      
      if (categories.length > 0) {
        console.log('第一个分类:', {
          id: categories[0]._id,
          name: categories[0].name
        });
      }
      
    } catch (error) {
      console.log('❌ 获取菜品分类失败:', error.message);
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
testFixedService();
