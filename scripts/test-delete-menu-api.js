const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

/**
 * 测试删除菜单API功能
 */
async function testDeleteMenuAPI() {
  let pool;
  
  try {
    console.log('🧪 开始测试删除菜单API功能...');
    
    // 创建数据库连接池
    pool = mysql.createPool({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+00:00'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 创建一个草稿菜单用于测试
    console.log('\n📋 创建草稿菜单用于测试...');
    const testMenuId = 'test-delete-api-' + Date.now();
    const adminId = 'e87abd4e-f5ad-4012-926c-bb616b260c6b';
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 3); // 使用大后天的日期避免冲突
    const dateStr = testDate.toISOString().split('T')[0];
    
    await pool.execute(
      `INSERT INTO menus (_id, publishDate, mealType, publishStatus, publisherId, createTime, updateTime) 
       VALUES (?, ?, 'lunch', 'draft', ?, NOW(), NOW())`,
      [testMenuId, dateStr, adminId]
    );
    console.log('✅ 草稿菜单创建成功，ID:', testMenuId);
    
    // 2. 测试删除草稿菜单
    console.log('\n📋 测试删除草稿菜单...');
    try {
      const result = await adminService.deleteMenu(pool, testMenuId, adminId);
      console.log('✅ 删除草稿菜单成功:', result);
    } catch (error) {
      console.log('❌ 删除草稿菜单失败:', error.message);
    }
    
    // 3. 验证菜单是否被删除
    console.log('\n📋 验证菜单是否被删除...');
    const [menus] = await pool.execute(
      'SELECT _id FROM menus WHERE _id = ?',
      [testMenuId]
    );
    
    if (menus.length === 0) {
      console.log('✅ 菜单删除验证成功');
    } else {
      console.log('❌ 菜单删除验证失败，菜单仍然存在');
    }
    
    // 4. 测试删除已发布的菜单（应该失败）
    console.log('\n📋 测试删除已发布的菜单（应该失败）...');
    const [publishedMenus] = await pool.execute(
      'SELECT _id, publishStatus FROM menus WHERE publishStatus = "published" LIMIT 1'
    );
    
    if (publishedMenus.length > 0) {
      const publishedMenuId = publishedMenus[0]._id;
      console.log(`找到已发布菜单: ${publishedMenuId}`);
      
      try {
        await adminService.deleteMenu(pool, publishedMenuId, adminId);
        console.log('❌ 删除已发布菜单应该失败，但成功了');
      } catch (error) {
        if (error.message.includes('已发布的菜单不能删除')) {
          console.log('✅ 删除已发布菜单正确失败:', error.message);
        } else {
          console.log('❌ 删除已发布菜单失败，但错误信息不正确:', error.message);
        }
      }
    } else {
      console.log('ℹ️ 没有找到已发布的菜单进行测试');
    }
    
    // 5. 测试删除已撤回的菜单（应该失败）
    console.log('\n📋 测试删除已撤回的菜单（应该失败）...');
    const [revokedMenus] = await pool.execute(
      'SELECT _id FROM menus WHERE publishStatus = "revoked" LIMIT 1'
    );
    
    if (revokedMenus.length > 0) {
      const revokedMenuId = revokedMenus[0]._id;
      console.log(`找到已撤回菜单: ${revokedMenuId}`);
      
      try {
        await adminService.deleteMenu(pool, revokedMenuId, adminId);
        console.log('❌ 删除已撤回菜单应该失败，但成功了');
      } catch (error) {
        if (error.message.includes('已撤回的菜单不能删除')) {
          console.log('✅ 删除已撤回菜单正确失败:', error.message);
        } else {
          console.log('❌ 删除已撤回菜单失败，但错误信息不正确:', error.message);
        }
      }
    } else {
      console.log('ℹ️ 没有找到已撤回的菜单进行测试');
    }
    
    // 6. 测试删除不存在的菜单（应该失败）
    console.log('\n📋 测试删除不存在的菜单（应该失败）...');
    try {
      await adminService.deleteMenu(pool, 'non-existent-menu-id', adminId);
      console.log('❌ 删除不存在的菜单应该失败，但成功了');
    } catch (error) {
      if (error.message.includes('菜单不存在')) {
        console.log('✅ 删除不存在的菜单正确失败:', error.message);
      } else {
        console.log('❌ 删除不存在的菜单失败，但错误信息不正确:', error.message);
      }
    }
    
    // 7. 测试API接口路径
    console.log('\n📋 API接口信息...');
    console.log('删除菜单接口: DELETE /api/admin/menu/:menuId');
    console.log('撤回菜单接口: PUT /api/admin/menu/:menuId/revoke');
    console.log('需要管理员权限和有效的JWT Token');
    
    console.log('\n🎉 删除菜单API功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testDeleteMenuAPI();
