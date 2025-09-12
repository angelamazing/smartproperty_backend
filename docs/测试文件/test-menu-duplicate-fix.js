const mysql = require('mysql2/promise');
const config = require('./config/database');
const adminService = require('./services/adminService');

async function testMenuDuplicateFix() {
  let pool;
  
  try {
    console.log('🧪 测试菜单重复问题修复...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 清理可能存在的测试数据
    console.log('\n📋 测试1: 清理测试数据');
    try {
      await pool.execute('DELETE FROM menu_dishes WHERE menuId IN (SELECT _id FROM menus WHERE publishDate = "2025-08-30" AND mealType = "breakfast")');
      await pool.execute('DELETE FROM menus WHERE publishDate = "2025-08-30" AND mealType = "breakfast"');
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.log('⚠️ 清理测试数据时出现警告:', error.message);
    }
    
    // 测试2: 创建第一个菜单草稿
    console.log('\n📋 测试2: 创建第一个菜单草稿');
    try {
      const menuData1 = {
        date: '2025-08-30',
        mealType: 'breakfast',
        description: '第一个早餐菜单草稿',
        adminId: 'test-admin-001',
        dishes: [
          {
            dishId: 'test-dish-001',
            price: 15.00,
            sort: 1
          }
        ]
      };
      
      const result1 = await adminService.saveMenuDraft(pool, menuData1);
      console.log('✅ 第一个菜单草稿创建成功:', result1.id);
      
    } catch (error) {
      console.log('❌ 创建第一个菜单草稿失败:', error.message);
      return;
    }
    
    // 测试3: 尝试创建相同日期餐次的第二个菜单草稿（应该更新现有菜单）
    console.log('\n📋 测试3: 尝试创建相同日期餐次的第二个菜单草稿');
    try {
      const menuData2 = {
        date: '2025-08-30',
        mealType: 'breakfast',
        description: '第二个早餐菜单草稿（应该更新第一个）',
        adminId: 'test-admin-002',
        dishes: [
          {
            dishId: 'test-dish-002',
            price: 20.00,
            sort: 1
          },
          {
            dishId: 'test-dish-003',
            price: 25.00,
            sort: 2
          }
        ]
      };
      
      const result2 = await adminService.saveMenuDraft(pool, menuData2);
      console.log('✅ 第二个菜单草稿处理成功:', result2.id);
      
      // 验证是否更新了现有菜单
      const [updatedMenu] = await pool.execute(
        'SELECT _id, description, publisherId FROM menus WHERE publishDate = "2025-08-30" AND mealType = "breakfast"'
      );
      
      if (updatedMenu.length === 1) {
        console.log('✅ 菜单更新验证成功:');
        console.log(`  - ID: ${updatedMenu[0]._id}`);
        console.log(`  - 描述: ${updatedMenu[0].description}`);
        console.log(`  - 发布者: ${updatedMenu[0].publisherId}`);
      }
      
    } catch (error) {
      console.log('❌ 处理第二个菜单草稿失败:', error.message);
    }
    
    // 测试4: 发布菜单
    console.log('\n📋 测试4: 发布菜单');
    try {
      const publishData = {
        date: '2025-08-30',
        mealType: 'breakfast',
        description: '发布早餐菜单',
        adminId: 'test-admin-003',
        dishes: [
          {
            dishId: 'test-dish-004',
            price: 18.00,
            sort: 1
          }
        ]
      };
      
      const publishResult = await adminService.publishMenu(pool, publishData);
      console.log('✅ 菜单发布成功:', publishResult.id);
      
      // 验证发布状态
      const [publishedMenu] = await pool.execute(
        'SELECT publishStatus FROM menus WHERE _id = ?',
        [publishResult.id]
      );
      
      if (publishedMenu.length > 0 && publishedMenu[0].publishStatus === 'published') {
        console.log('✅ 菜单发布状态验证成功');
      }
      
    } catch (error) {
      console.log('❌ 发布菜单失败:', error.message);
    }
    
    // 测试5: 尝试再次发布相同日期餐次的菜单（应该失败）
    console.log('\n📋 测试5: 尝试再次发布相同日期餐次的菜单');
    try {
      const duplicateData = {
        date: '2025-08-30',
        mealType: 'breakfast',
        description: '重复的早餐菜单',
        adminId: 'test-admin-004',
        dishes: []
      };
      
      await adminService.publishMenu(pool, duplicateData);
      console.log('❌ 重复发布应该失败但没有失败');
      
    } catch (error) {
      console.log('✅ 重复发布被正确阻止:', error.message);
    }
    
    // 测试6: 清理测试数据
    console.log('\n📋 测试6: 清理测试数据');
    try {
      await pool.execute('DELETE FROM menu_dishes WHERE menuId IN (SELECT _id FROM menus WHERE publishDate = "2025-08-30" AND mealType = "breakfast")');
      await pool.execute('DELETE FROM menus WHERE publishDate = "2025-08-30" AND mealType = "breakfast"');
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.log('⚠️ 清理测试数据时出现警告:', error.message);
    }
    
    console.log('\n🎉 菜单重复问题修复测试完成！');
    
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
testMenuDuplicateFix();
