const mysql = require('mysql2/promise');
const config = require('./config/database');
const adminService = require('./services/adminService');

async function testMenuByDateAPI() {
  let pool;
  
  try {
    console.log('🧪 测试根据日期获取菜单API...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 检查数据库表结构
    console.log('\n📋 测试1: 检查数据库表结构');
    try {
      const [tables] = await pool.execute('SHOW TABLES LIKE "menus"');
      if (tables.length > 0) {
        console.log('✅ menus表存在');
      } else {
        console.log('❌ menus表不存在');
        return;
      }
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
      return;
    }
    
    // 测试2: 测试获取不存在的菜单
    console.log('\n📋 测试2: 测试获取不存在的菜单');
    try {
      const result = await adminService.getMenuByDate(pool, {
        date: '2025-01-01',
        mealType: 'breakfast'
      });
      
      if (result === null) {
        console.log('✅ 获取不存在的菜单返回null（正确行为）');
      } else {
        console.log('⚠️ 获取不存在的菜单返回了数据:', result);
      }
      
    } catch (error) {
      console.log('❌ 获取不存在的菜单失败:', error.message);
    }
    
    // 测试3: 创建测试菜单数据
    console.log('\n📋 测试3: 创建测试菜单数据');
    let testMenuId;
    try {
      const menuData = {
        date: '2025-08-30',
        mealType: 'breakfast',
        description: '测试早餐菜单',
        adminId: 'test-admin-001',
        dishes: [
          {
            dishId: 'test-dish-001',
            price: 15.00,
            sort: 1
          }
        ]
      };
      
      const result = await adminService.saveMenuDraft(pool, menuData);
      testMenuId = result.id;
      console.log('✅ 测试菜单创建成功:', testMenuId);
      
    } catch (error) {
      console.log('❌ 创建测试菜单失败:', error.message);
      return;
    }
    
    // 测试4: 测试获取存在的菜单
    console.log('\n📋 测试4: 测试获取存在的菜单');
    try {
      const result = await adminService.getMenuByDate(pool, {
        date: '2025-08-30',
        mealType: 'breakfast'
      });
      
      if (result) {
        console.log('✅ 获取存在的菜单成功:');
        console.log(`  - ID: ${result._id}`);
        console.log(`  - 名称: ${result.name}`);
        console.log(`  - 日期: ${result.publishDate}`);
        console.log(`  - 餐次: ${result.mealType}`);
        console.log(`  - 状态: ${result.publishStatus}`);
        console.log(`  - 菜品数量: ${result.dishes ? result.dishes.length : 0}`);
      } else {
        console.log('❌ 获取存在的菜单返回null');
      }
      
    } catch (error) {
      console.log('❌ 获取存在的菜单失败:', error.message);
    }
    
    // 测试5: 测试不同餐次
    console.log('\n📋 测试5: 测试不同餐次');
    try {
      const result = await adminService.getMenuByDate(pool, {
        date: '2025-08-30',
        mealType: 'lunch'
      });
      
      if (result === null) {
        console.log('✅ 获取不同餐次菜单返回null（正确行为）');
      } else {
        console.log('⚠️ 获取不同餐次菜单返回了数据:', result);
      }
      
    } catch (error) {
      console.log('❌ 获取不同餐次菜单失败:', error.message);
    }
    
    // 测试6: 清理测试数据
    console.log('\n📋 测试6: 清理测试数据');
    try {
      await pool.execute('DELETE FROM menu_dishes WHERE menuId = ?', [testMenuId]);
      await pool.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.log('❌ 清理测试数据失败:', error.message);
    }
    
    console.log('\n🎉 根据日期获取菜单API测试完成！');
    
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
testMenuByDateAPI();
