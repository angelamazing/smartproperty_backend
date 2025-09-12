const mysql = require('mysql2/promise');
const config = require('./config/database');
const adminService = require('./services/adminService');

async function testMenuDraftFix() {
  let pool;
  
  try {
    console.log('🧪 测试菜单草稿保存功能修复...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 清理可能存在的测试数据
    console.log('\n📋 测试1: 清理测试数据');
    try {
      await pool.execute('DELETE FROM menu_dishes WHERE menuId IN (SELECT _id FROM menus WHERE publishDate = "2025-08-30" AND mealType = "lunch")');
      await pool.execute('DELETE FROM menus WHERE publishDate = "2025-08-30" AND mealType = "lunch"');
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.log('⚠️ 清理测试数据时出现警告:', error.message);
    }
    
    // 测试2: 创建菜单草稿
    console.log('\n📋 测试2: 创建菜单草稿');
    try {
      const menuData = {
        date: '2025-08-30',
        mealType: 'lunch',
        description: '测试午餐菜单草稿',
        adminId: 'test-admin-001',
        dishes: [
          {
            dishId: 'test-dish-001',
            price: 25.00,
            sort: 1
          },
          {
            dishId: 'test-dish-002',
            price: 30.00,
            sort: 2
          },
          {
            dishId: 'test-dish-003',
            price: 20.00,
            sort: 3
          }
        ]
      };
      
      const result = await adminService.saveMenuDraft(pool, menuData);
      console.log('✅ 菜单草稿保存成功:', result.id);
      
      // 验证菜单基本信息
      const [savedMenu] = await pool.execute(
        'SELECT _id, publishDate, mealType, description, publishStatus FROM menus WHERE _id = ?',
        [result.id]
      );
      
      if (savedMenu.length > 0) {
        console.log('✅ 菜单基本信息验证成功:');
        console.log(`  - ID: ${savedMenu[0]._id}`);
        console.log(`  - 日期: ${savedMenu[0].publishDate}`);
        console.log(`  - 餐次: ${savedMenu[0].mealType}`);
        console.log(`  - 描述: ${savedMenu[0].description}`);
        console.log(`  - 状态: ${savedMenu[0].publishStatus}`);
      }
      
      // 验证菜品关联
      const [menuDishes] = await pool.execute(
        'SELECT COUNT(*) as count FROM menu_dishes WHERE menuId = ?',
        [result.id]
      );
      
      console.log(`✅ 菜品关联验证成功，共 ${menuDishes[0].count} 个菜品`);
      
    } catch (error) {
      console.log('❌ 创建菜单草稿失败:', error.message);
      return;
    }
    
    // 测试3: 更新现有菜单草稿
    console.log('\n📋 测试3: 更新现有菜单草稿');
    try {
      const updateData = {
        date: '2025-08-30',
        mealType: 'lunch',
        description: '更新后的午餐菜单草稿',
        adminId: 'test-admin-002',
        dishes: [
          {
            dishId: 'test-dish-004',
            price: 35.00,
            sort: 1
          },
          {
            dishId: 'test-dish-005',
            price: 40.00,
            sort: 2
          }
        ]
      };
      
      const result = await adminService.saveMenuDraft(pool, updateData);
      console.log('✅ 菜单草稿更新成功:', result.id);
      
      // 验证更新结果
      const [updatedMenu] = await pool.execute(
        'SELECT description, publisherId FROM menus WHERE _id = ?',
        [result.id]
      );
      
      if (updatedMenu.length > 0) {
        console.log('✅ 菜单更新验证成功:');
        console.log(`  - 描述: ${updatedMenu[0].description}`);
        console.log(`  - 发布者: ${updatedMenu[0].publisherId}`);
      }
      
      // 验证菜品关联是否更新
      const [updatedDishes] = await pool.execute(
        'SELECT COUNT(*) as count FROM menu_dishes WHERE menuId = ?',
        [result.id]
      );
      
      console.log(`✅ 菜品关联更新验证成功，共 ${updatedDishes[0].count} 个菜品`);
      
    } catch (error) {
      console.log('❌ 更新菜单草稿失败:', error.message);
    }
    
    // 测试4: 清理测试数据
    console.log('\n📋 测试4: 清理测试数据');
    try {
      const [menus] = await pool.execute(
        'SELECT _id FROM menus WHERE publishDate = "2025-08-30" AND mealType = "lunch"'
      );
      
      for (const menu of menus) {
        await pool.execute('DELETE FROM menu_dishes WHERE menuId = ?', [menu._id]);
        await pool.execute('DELETE FROM menus WHERE _id = ?', [menu._id]);
      }
      
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.log('❌ 清理测试数据失败:', error.message);
    }
    
    console.log('\n🎉 菜单草稿保存功能测试完成！');
    
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
testMenuDraftFix();
