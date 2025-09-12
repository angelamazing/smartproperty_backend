const mysql = require('mysql2/promise');
const config = require('./config/database');
const dishService = require('./services/dishService');

async function testMenuDishIntegration() {
  let pool;
  
  try {
    console.log('🧪 测试菜单菜品集成功能...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 获取可用菜品列表
    console.log('\n📋 测试1: 获取可用菜品列表');
    try {
      const dishes = await dishService.getAvailableDishes(pool, {
        pageSize: 10,
        status: 'active'
      });
      console.log('✅ 获取可用菜品成功，数量:', dishes.length);
      
      if (dishes.length > 0) {
        console.log('前3个菜品:');
        dishes.slice(0, 3).forEach((dish, index) => {
          console.log(`  ${index + 1}. ${dish.name} (${dish.categoryName}) - ￥${dish.price}`);
        });
      }
      
    } catch (error) {
      console.log('❌ 获取可用菜品失败:', error.message);
    }
    
    // 测试2: 按分类获取菜品
    console.log('\n📋 测试2: 按分类获取菜品');
    try {
      // 先获取一个分类ID
      const [categories] = await pool.execute('SELECT _id FROM dish_categories LIMIT 1');
      if (categories.length > 0) {
        const categoryId = categories[0]._id;
        console.log('测试分类ID:', categoryId);
        
        const dishes = await dishService.getAvailableDishes(pool, {
          pageSize: 5,
          categoryId,
          status: 'active'
        });
        console.log('✅ 按分类获取菜品成功，数量:', dishes.length);
      }
    } catch (error) {
      console.log('❌ 按分类获取菜品失败:', error.message);
    }
    
    // 测试3: 搜索菜品
    console.log('\n📋 测试3: 搜索菜品');
    try {
      const dishes = await dishService.getAvailableDishes(pool, {
        pageSize: 5,
        keyword: '汤',
        status: 'active'
      });
      console.log('✅ 搜索菜品成功，数量:', dishes.length);
      
      if (dishes.length > 0) {
        console.log('搜索结果:');
        dishes.forEach((dish, index) => {
          console.log(`  ${index + 1}. ${dish.name} (${dish.categoryName})`);
        });
      }
    } catch (error) {
      console.log('❌ 搜索菜品失败:', error.message);
    }
    
    // 测试4: 获取菜单菜品
    console.log('\n📋 测试4: 获取菜单菜品');
    try {
      // 先获取一个菜单ID
      const [menus] = await pool.execute('SELECT _id FROM menus LIMIT 1');
      if (menus.length > 0) {
        const menuId = menus[0]._id;
        console.log('测试菜单ID:', menuId);
        
        const menuDishes = await dishService.getMenuDishes(pool, menuId);
        console.log('✅ 获取菜单菜品成功，数量:', menuDishes.length);
        
        if (menuDishes.length > 0) {
          console.log('菜单菜品:');
          menuDishes.forEach((dish, index) => {
            console.log(`  ${index + 1}. ${dish.dishName} (${dish.categoryName}) - ￥${dish.price} - 排序:${dish.sort}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ 获取菜单菜品失败:', error.message);
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
testMenuDishIntegration();
