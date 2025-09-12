const mysql = require('mysql2/promise');
const config = require('./config/database');
const adminService = require('./services/adminService');

async function testMenuDishIntegrationFull() {
  let pool;
  
  try {
    console.log('🧪 测试完整的菜单菜品集成功能...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 获取可用菜品列表
    console.log('\n📋 测试1: 获取可用菜品列表');
    try {
      const dishes = await adminService.getAvailableDishes(pool, {
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
    
    // 测试2: 创建测试菜单
    console.log('\n📋 测试2: 创建测试菜单');
    let testMenuId;
    try {
      const menuData = {
        date: '2025-08-30',
        mealType: 'lunch',
        description: '测试午餐菜单',
        adminId: 'test-admin-001'
      };
      
      const menu = await adminService.saveMenuDraft(pool, menuData);
      testMenuId = menu.id;
      console.log('✅ 创建测试菜单成功，ID:', testMenuId);
      
    } catch (error) {
      console.log('❌ 创建测试菜单失败:', error.message);
      return; // 如果创建菜单失败，后续测试无法进行
    }
    
    // 测试3: 设置菜单菜品
    console.log('\n📋 测试3: 设置菜单菜品');
    try {
      // 先获取一些可用菜品
      const availableDishes = await adminService.getAvailableDishes(pool, {
        pageSize: 5,
        status: 'active'
      });
      
      if (availableDishes.length > 0) {
        const dishItems = availableDishes.slice(0, 3).map((dish, index) => ({
          dishId: dish._id,
          price: dish.price + (index * 2), // 稍微调整价格
          sort: index + 1
        }));
        
        console.log('选择的菜品项目:', dishItems);
        
        const result = await adminService.setMenuDishes(pool, testMenuId, dishItems);
        console.log('✅ 设置菜单菜品成功:', result.message);
      } else {
        console.log('⚠️ 没有可用菜品，跳过设置测试');
      }
      
    } catch (error) {
      console.log('❌ 设置菜单菜品失败:', error.message);
    }
    
    // 测试4: 获取菜单菜品
    console.log('\n📋 测试4: 获取菜单菜品');
    try {
      const menuDishes = await adminService.getMenuDishes(pool, testMenuId);
      console.log('✅ 获取菜单菜品成功，数量:', menuDishes.length);
      
      if (menuDishes.length > 0) {
        console.log('菜单菜品详情:');
        menuDishes.forEach((dish, index) => {
          console.log(`  ${index + 1}. ${dish.dishName} (${dish.categoryName}) - ￥${dish.price} - 排序:${dish.sort}`);
        });
      }
      
    } catch (error) {
      console.log('❌ 获取菜单菜品失败:', error.message);
    }
    
    // 测试5: 更新菜单菜品
    console.log('\n📋 测试5: 更新菜单菜品');
    try {
      const updatedDishItems = [
        {
          dishId: 'test-dish-001',
          price: 25.00,
          sort: 1
        },
        {
          dishId: 'test-dish-002',
          price: 30.00,
          sort: 2
        }
      ];
      
      const result = await adminService.setMenuDishes(pool, testMenuId, updatedDishItems);
      console.log('✅ 更新菜单菜品成功:', result.message);
      
      // 验证更新结果
      const updatedDishes = await adminService.getMenuDishes(pool, testMenuId);
      console.log('更新后的菜品数量:', updatedDishes.length);
      
    } catch (error) {
      console.log('❌ 更新菜单菜品失败:', error.message);
    }
    
    // 测试6: 清理测试数据
    console.log('\n📋 测试6: 清理测试数据');
    try {
      // 删除测试菜单
      await pool.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
      console.log('✅ 删除测试菜单成功');
      
      // 删除相关的菜品关联
      await pool.execute('DELETE FROM menu_dishes WHERE menuId = ?', [testMenuId]);
      console.log('✅ 删除菜单菜品关联成功');
      
    } catch (error) {
      console.log('❌ 清理测试数据失败:', error.message);
    }
    
    console.log('\n🎉 完整测试完成！');
    
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
testMenuDishIntegrationFull();
