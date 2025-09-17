const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

/**
 * 测试撤回现有菜单功能
 */
async function testRevokeExistingMenu() {
  let pool;
  
  try {
    console.log('🧪 开始测试撤回现有菜单功能...');
    
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
    
    // 1. 查找一个已发布的菜单
    console.log('\n📋 查找已发布的菜单...');
    const [menus] = await pool.execute(
      'SELECT _id, publishDate, mealType, publishStatus, publisherId FROM menus WHERE publishStatus = "published" LIMIT 1'
    );
    
    if (menus.length === 0) {
      console.log('❌ 没有找到已发布的菜单');
      return;
    }
    
    const menu = menus[0];
    console.log('✅ 找到已发布菜单:', {
      id: menu._id,
      date: menu.publishDate,
      mealType: menu.mealType,
      status: menu.publishStatus,
      publisherId: menu.publisherId
    });
    
    // 2. 验证菜单状态
    console.log('\n📋 验证菜单状态...');
    const [menuBefore] = await pool.execute(
      'SELECT _id, publishStatus, updateBy FROM menus WHERE _id = ?',
      [menu._id]
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
    
    // 3. 使用现有的管理员ID进行撤回测试
    console.log('\n📋 测试撤回菜单功能...');
    const adminId = menu.publisherId || 'e87abd4e-f5ad-4012-926c-bb616b260c6b'; // 使用现有管理员ID
    
    try {
      await adminService.revokeMenu(pool, menu._id, adminId);
      console.log('✅ 撤回菜单功能调用成功');
    } catch (error) {
      console.log('❌ 撤回菜单功能调用失败:', error.message);
      return;
    }
    
    // 4. 验证撤回结果
    console.log('\n📋 验证撤回结果...');
    const [menuAfter] = await pool.execute(
      'SELECT _id, publishStatus, updateBy, updateTime FROM menus WHERE _id = ?',
      [menu._id]
    );
    
    if (menuAfter.length > 0) {
      const menuResult = menuAfter[0];
      console.log('✅ 撤回结果验证成功');
      console.log('撤回后菜单信息:', {
        id: menuResult._id,
        status: menuResult.publishStatus,
        updateBy: menuResult.updateBy,
        updateTime: menuResult.updateTime
      });
      
      if (menuResult.publishStatus === 'revoked' && menuResult.updateBy === adminId) {
        console.log('🎉 撤回菜单功能完全正常！');
      } else {
        console.log('❌ 撤回结果不符合预期');
        console.log('期望状态: revoked, 实际状态:', menuResult.publishStatus);
        console.log('期望更新人:', adminId, '实际更新人:', menuResult.updateBy);
      }
    } else {
      console.log('❌ 撤回结果验证失败');
    }
    
    // 5. 恢复菜单状态（用于后续测试）
    console.log('\n📋 恢复菜单状态...');
    await pool.execute(
      'UPDATE menus SET publishStatus = "published", updateBy = NULL WHERE _id = ?',
      [menu._id]
    );
    console.log('✅ 菜单状态已恢复为已发布');
    
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
testRevokeExistingMenu();
