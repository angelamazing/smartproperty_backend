const mysql = require('mysql2/promise');
const config = require('./config/database');
const adminService = require('./services/adminService');

async function testMenuPublishFix() {
  let pool;
  
  try {
    console.log('🧪 测试菜单发布功能修复...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 检查数据库表结构
    console.log('\n📋 测试1: 检查数据库表结构');
    try {
      const [tables] = await pool.execute('SHOW TABLES LIKE "menus"');
      if (tables.length > 0) {
        console.log('✅ menus表存在');
        
        // 检查字段结构
        const [columns] = await pool.execute('DESCRIBE menus');
        console.log('menus表字段:');
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      } else {
        console.log('❌ menus表不存在');
        return;
      }
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
      return;
    }
    
    // 测试2: 测试菜单草稿保存
    console.log('\n📋 测试2: 测试菜单草稿保存');
    try {
      const menuData = {
        date: '2025-08-30',
        mealType: 'lunch',
        description: '测试午餐菜单',
        adminId: 'test-admin-001',
        dishes: [
          {
            dishId: 'test-dish-001',
            price: 25.00,
            sort: 1
          }
        ]
      };
      
      const result = await adminService.saveMenuDraft(pool, menuData);
      console.log('✅ 保存菜单草稿成功:', result.id);
      
      // 测试3: 测试菜单发布
      console.log('\n📋 测试3: 测试菜单发布');
      try {
        const publishResult = await adminService.publishMenu(pool, menuData);
        console.log('✅ 发布菜单成功:', publishResult.id);
        
        // 验证发布结果
        const [publishedMenu] = await pool.execute(
          'SELECT _id, publishDate, mealType, publishStatus FROM menus WHERE _id = ?',
          [publishResult.id]
        );
        
        if (publishedMenu.length > 0) {
          console.log('✅ 菜单发布验证成功:');
          console.log(`  - ID: ${publishedMenu[0]._id}`);
          console.log(`  - 日期: ${publishedMenu[0].publishDate}`);
          console.log(`  - 餐次: ${publishedMenu[0].mealType}`);
          console.log(`  - 状态: ${publishedMenu[0].publishStatus}`);
        }
        
        // 测试4: 测试菜单菜品获取
        console.log('\n📋 测试4: 测试菜单菜品获取');
        try {
          const menuDishes = await adminService.getMenuDishes(pool, publishResult.id);
          console.log('✅ 获取菜单菜品成功，数量:', menuDishes.length);
          
          if (menuDishes.length > 0) {
            console.log('菜品详情:');
            menuDishes.forEach((dish, index) => {
              console.log(`  ${index + 1}. ${dish.dishName} - ￥${dish.price} - 排序:${dish.sort}`);
            });
          }
          
        } catch (error) {
          console.log('❌ 获取菜单菜品失败:', error.message);
        }
        
        // 测试5: 测试菜单撤回
        console.log('\n📋 测试5: 测试菜单撤回');
        try {
          await adminService.revokeMenu(pool, publishResult.id, 'test-admin-001');
          console.log('✅ 菜单撤回成功');
          
          // 验证撤回结果
          const [revokedMenu] = await pool.execute(
            'SELECT publishStatus FROM menus WHERE _id = ?',
            [publishResult.id]
          );
          
          if (revokedMenu.length > 0 && revokedMenu[0].publishStatus === 'revoked') {
            console.log('✅ 菜单撤回验证成功');
          }
          
        } catch (error) {
          console.log('❌ 菜单撤回失败:', error.message);
        }
        
        // 清理测试数据
        console.log('\n📋 清理测试数据');
        try {
          await pool.execute('DELETE FROM menu_dishes WHERE menuId = ?', [publishResult.id]);
          await pool.execute('DELETE FROM menus WHERE _id = ?', [publishResult.id]);
          console.log('✅ 测试数据清理成功');
        } catch (error) {
          console.log('❌ 清理测试数据失败:', error.message);
        }
        
      } catch (error) {
        console.log('❌ 发布菜单失败:', error.message);
      }
      
    } catch (error) {
      console.log('❌ 保存菜单草稿失败:', error.message);
    }
    
    console.log('\n🎉 菜单发布功能测试完成！');
    
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
testMenuPublishFix();
