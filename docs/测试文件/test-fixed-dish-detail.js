const mysql = require('mysql2/promise');
const config = require('./config/database');
const dishService = require('./services/dishService');

async function testFixedDishDetail() {
  let pool;
  
  try {
    console.log('🧪 测试修复后的菜品详情接口...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 获取菜品详情
    console.log('\n📋 测试1: 获取菜品详情');
    try {
      // 先获取一个菜品ID
      const [dishes] = await pool.execute('SELECT _id FROM dishes LIMIT 1');
      if (dishes.length === 0) {
        console.log('❌ 没有找到菜品数据');
        return;
      }
      
      const dishId = dishes[0]._id;
      console.log('测试菜品ID:', dishId);
      
      const dish = await dishService.getDishDetail(pool, dishId);
      if (dish) {
        console.log('✅ 获取菜品详情成功');
        console.log('菜品信息:', {
          id: dish._id,
          name: dish.name,
          categoryName: dish.categoryName,
          createByName: dish.createByName,
          tags: dish.tags
        });
      } else {
        console.log('❌ 菜品不存在');
      }
      
    } catch (error) {
      console.log('❌ 获取菜品详情失败:', error.message);
      console.log('错误详情:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
    }
    
    // 测试2: 测试菜品分类
    console.log('\n📋 测试2: 测试菜品分类');
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
testFixedDishDetail();
