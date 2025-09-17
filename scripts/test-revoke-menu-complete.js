const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

/**
 * 完整测试撤回菜单功能
 */
async function testRevokeMenuComplete() {
  let pool;
  
  try {
    console.log('🧪 开始完整测试撤回菜单功能...');
    
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
    
    // 2. 测试撤回菜单功能
    console.log('\n📋 测试撤回菜单功能...');
    const adminId = menu.publisherId || 'e87abd4e-f5ad-4012-926c-bb616b260c6b';
    
    try {
      await adminService.revokeMenu(pool, menu._id, adminId);
      console.log('✅ 撤回菜单功能调用成功');
    } catch (error) {
      console.log('❌ 撤回菜单功能调用失败:', error.message);
      return;
    }
    
    // 3. 验证撤回结果
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
        
        // 4. 测试重复撤回（应该失败）
        console.log('\n📋 测试重复撤回（应该失败）...');
        try {
          await adminService.revokeMenu(pool, menu._id, adminId);
          console.log('❌ 重复撤回应该失败，但成功了');
        } catch (error) {
          if (error.message.includes('菜单不存在或状态不允许撤回')) {
            console.log('✅ 重复撤回正确失败:', error.message);
          } else {
            console.log('❌ 重复撤回失败，但错误信息不正确:', error.message);
          }
        }
        
        // 5. 测试撤回已撤回的菜单（应该失败）
        console.log('\n📋 测试撤回已撤回的菜单（应该失败）...');
        try {
          await adminService.revokeMenu(pool, menu._id, adminId);
          console.log('❌ 撤回已撤回的菜单应该失败，但成功了');
        } catch (error) {
          if (error.message.includes('菜单不存在或状态不允许撤回')) {
            console.log('✅ 撤回已撤回的菜单正确失败:', error.message);
          } else {
            console.log('❌ 撤回已撤回的菜单失败，但错误信息不正确:', error.message);
          }
        }
        
      } else {
        console.log('❌ 撤回结果不符合预期');
        console.log('期望状态: revoked, 实际状态:', menuResult.publishStatus);
        console.log('期望更新人:', adminId, '实际更新人:', menuResult.updateBy);
      }
    } else {
      console.log('❌ 撤回结果验证失败');
    }
    
    // 6. 恢复菜单状态（用于后续测试）
    console.log('\n📋 恢复菜单状态...');
    await pool.execute(
      'UPDATE menus SET publishStatus = "published", updateBy = NULL WHERE _id = ?',
      [menu._id]
    );
    console.log('✅ 菜单状态已恢复为已发布');
    
    // 7. 测试撤回不存在的菜单（应该失败）
    console.log('\n📋 测试撤回不存在的菜单（应该失败）...');
    try {
      await adminService.revokeMenu(pool, 'non-existent-menu-id', adminId);
      console.log('❌ 撤回不存在的菜单应该失败，但成功了');
    } catch (error) {
      if (error.message.includes('菜单不存在或状态不允许撤回')) {
        console.log('✅ 撤回不存在的菜单正确失败:', error.message);
      } else {
        console.log('❌ 撤回不存在的菜单失败，但错误信息不正确:', error.message);
      }
    }
    
    console.log('\n🎉 撤回菜单功能完整测试完成！');
    
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
testRevokeMenuComplete();
