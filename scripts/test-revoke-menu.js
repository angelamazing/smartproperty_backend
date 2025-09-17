const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

/**
 * 测试撤回菜单功能
 */
async function testRevokeMenu() {
  let pool;
  
  try {
    console.log('🧪 开始测试撤回菜单功能...');
    
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
    
    // 1. 创建一个测试菜单
    console.log('\n📋 创建测试菜单...');
    const testMenuId = 'test-menu-revoke-' + Date.now();
    const adminId = 'test-admin-' + Date.now();
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1); // 使用明天的日期避免冲突
    const dateStr = testDate.toISOString().split('T')[0];
    
    await pool.execute(
      `INSERT INTO menus (_id, publishDate, mealType, publishStatus, publisherId, createTime, updateTime) 
       VALUES (?, ?, 'lunch', 'published', NULL, NOW(), NOW())`,
      [testMenuId, dateStr]
    );
    console.log('✅ 测试菜单创建成功，ID:', testMenuId);
    
    // 2. 验证菜单状态
    console.log('\n📋 验证菜单状态...');
    const [menuBefore] = await pool.execute(
      'SELECT _id, publishStatus, updateBy FROM menus WHERE _id = ?',
      [testMenuId]
    );
    
    if (menuBefore.length > 0) {
      console.log('✅ 菜单状态验证成功');
      console.log('菜单信息:', {
        id: menuBefore[0]._id,
        status: menuBefore[0].publishStatus,
        updateBy: menuBefore[0].updateBy
      });
    } else {
      console.log('❌ 菜单状态验证失败');
      return;
    }
    
    // 3. 测试撤回菜单功能
    console.log('\n📋 测试撤回菜单功能...');
    try {
      await adminService.revokeMenu(pool, testMenuId, adminId);
      console.log('✅ 撤回菜单功能调用成功');
    } catch (error) {
      console.log('❌ 撤回菜单功能调用失败:', error.message);
      return;
    }
    
    // 4. 验证撤回结果
    console.log('\n📋 验证撤回结果...');
    const [menuAfter] = await pool.execute(
      'SELECT _id, publishStatus, updateBy, updateTime FROM menus WHERE _id = ?',
      [testMenuId]
    );
    
    if (menuAfter.length > 0) {
      const menu = menuAfter[0];
      console.log('✅ 撤回结果验证成功');
      console.log('撤回后菜单信息:', {
        id: menu._id,
        status: menu.publishStatus,
        updateBy: menu.updateBy,
        updateTime: menu.updateTime
      });
      
      if (menu.publishStatus === 'revoked' && menu.updateBy === adminId) {
        console.log('🎉 撤回菜单功能完全正常！');
      } else {
        console.log('❌ 撤回结果不符合预期');
      }
    } else {
      console.log('❌ 撤回结果验证失败');
    }
    
    // 5. 清理测试数据
    console.log('\n📋 清理测试数据...');
    await pool.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    console.log('✅ 测试数据清理完成');
    
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
testRevokeMenu();
