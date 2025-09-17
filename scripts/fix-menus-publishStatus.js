const mysql = require('mysql2/promise');
const config = require('../config/database');

/**
 * 修复menus表publishStatus字段枚举值
 */
async function fixMenusPublishStatus() {
  let pool;
  
  try {
    console.log('🔧 开始修复menus表publishStatus字段枚举值...');
    
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
    
    // 1. 检查当前publishStatus字段定义
    console.log('\n📋 检查当前publishStatus字段定义...');
    const [columns] = await pool.execute(
      `SELECT COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'menus' 
         AND COLUMN_NAME = 'publishStatus'`,
      [config.database.database]
    );
    
    if (columns.length > 0) {
      console.log('✅ publishStatus字段信息:');
      console.log('类型:', columns[0].COLUMN_TYPE);
      console.log('默认值:', columns[0].COLUMN_DEFAULT);
      console.log('可空:', columns[0].IS_NULLABLE);
      console.log('注释:', columns[0].COLUMN_COMMENT);
      
      // 检查是否包含revoked值
      if (columns[0].COLUMN_TYPE.includes('revoked')) {
        console.log('✅ publishStatus字段已包含revoked值');
        return;
      } else {
        console.log('❌ publishStatus字段不包含revoked值，需要修复');
      }
    } else {
      console.log('❌ 未找到publishStatus字段');
      return;
    }
    
    // 2. 修改publishStatus字段，添加revoked值
    console.log('\n📋 修改publishStatus字段，添加revoked值...');
    try {
      await pool.execute(
        'ALTER TABLE menus MODIFY COLUMN publishStatus ENUM(\'draft\',\'published\',\'archived\',\'revoked\') DEFAULT \'draft\' COMMENT \'发布状态\''
      );
      console.log('✅ publishStatus字段修改成功');
    } catch (error) {
      console.log('❌ 修改publishStatus字段失败:', error.message);
      return;
    }
    
    // 3. 验证修改结果
    console.log('\n📋 验证修改结果...');
    const [newColumns] = await pool.execute(
      `SELECT COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'menus' 
         AND COLUMN_NAME = 'publishStatus'`,
      [config.database.database]
    );
    
    if (newColumns.length > 0) {
      console.log('✅ 修改后publishStatus字段信息:');
      console.log('类型:', newColumns[0].COLUMN_TYPE);
      console.log('默认值:', newColumns[0].COLUMN_DEFAULT);
      console.log('可空:', newColumns[0].IS_NULLABLE);
      console.log('注释:', newColumns[0].COLUMN_COMMENT);
      
      if (newColumns[0].COLUMN_TYPE.includes('revoked')) {
        console.log('✅ publishStatus字段修改验证成功');
      } else {
        console.log('❌ publishStatus字段修改验证失败');
        return;
      }
    } else {
      console.log('❌ 修改后未找到publishStatus字段');
      return;
    }
    
    // 4. 测试撤回菜单功能
    console.log('\n📋 测试撤回菜单功能...');
    try {
      // 查找一个已发布的菜单
      const [menus] = await pool.execute(
        'SELECT _id, publishStatus FROM menus WHERE publishStatus = "published" LIMIT 1'
      );
      
      if (menus.length > 0) {
        const menuId = menus[0]._id;
        const adminId = 'e87abd4e-f5ad-4012-926c-bb616b260c6b';
        
        console.log('找到测试菜单:', menuId);
        
        // 执行撤回
        const [result] = await pool.execute(
          'UPDATE menus SET publishStatus = "revoked", updateTime = NOW(), updateBy = ? WHERE _id = ? AND publishStatus = "published"',
          [adminId, menuId]
        );
        
        if (result.affectedRows > 0) {
          console.log('✅ 撤回菜单功能测试成功');
          
          // 验证结果
          const [updatedMenu] = await pool.execute(
            'SELECT _id, publishStatus, updateBy FROM menus WHERE _id = ?',
            [menuId]
          );
          
          if (updatedMenu.length > 0) {
            console.log('撤回后菜单状态:', updatedMenu[0].publishStatus);
            if (updatedMenu[0].publishStatus === 'revoked') {
              console.log('🎉 撤回菜单功能完全正常！');
            } else {
              console.log('❌ 撤回后状态不正确');
            }
          }
          
          // 恢复状态
          await pool.execute(
            'UPDATE menus SET publishStatus = "published", updateBy = NULL WHERE _id = ?',
            [menuId]
          );
          console.log('✅ 菜单状态已恢复');
          
        } else {
          console.log('❌ 撤回菜单功能测试失败');
        }
      } else {
        console.log('❌ 没有找到已发布的菜单进行测试');
      }
    } catch (error) {
      console.log('❌ 测试撤回菜单功能失败:', error.message);
    }
    
    console.log('\n🎉 menus表publishStatus字段修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行修复
fixMenusPublishStatus();
