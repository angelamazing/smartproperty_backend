const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 修复menus表缺失updateBy字段的问题
 */
async function fixMenusUpdateBy() {
  let pool;
  
  try {
    console.log('🔧 开始修复menus表updateBy字段...');
    
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
    
    // 1. 检查updateBy字段是否存在
    console.log('\n📋 检查updateBy字段是否存在...');
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'menus' 
         AND COLUMN_NAME = 'updateBy'`,
      [config.database.database]
    );
    
    if (columns.length > 0) {
      console.log('✅ updateBy字段已存在，无需修复');
      console.log('字段信息:', columns[0]);
      return;
    }
    
    console.log('❌ updateBy字段不存在，开始添加...');
    
    // 2. 添加updateBy字段
    console.log('\n📋 添加updateBy字段...');
    await pool.execute(
      'ALTER TABLE menus ADD COLUMN updateBy VARCHAR(36) COMMENT \'更新人\' AFTER updateTime'
    );
    console.log('✅ updateBy字段添加成功');
    
    // 3. 验证字段是否添加成功
    console.log('\n📋 验证字段添加结果...');
    const [newColumns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'menus' 
         AND COLUMN_NAME = 'updateBy'`,
      [config.database.database]
    );
    
    if (newColumns.length > 0) {
      console.log('✅ updateBy字段添加验证成功');
      console.log('字段信息:', newColumns[0]);
    } else {
      console.log('❌ updateBy字段添加验证失败');
      return;
    }
    
    // 4. 检查是否需要添加索引
    console.log('\n📋 检查updateBy字段索引...');
    try {
      await pool.execute('ALTER TABLE menus ADD INDEX idx_update_by (updateBy)');
      console.log('✅ updateBy字段索引添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ updateBy字段索引已存在，跳过');
      } else {
        console.log('⚠️ 添加updateBy字段索引失败:', error.message);
      }
    }
    
    // 5. 检查是否需要添加外键约束
    console.log('\n📋 检查updateBy字段外键约束...');
    try {
      await pool.execute(
        'ALTER TABLE menus ADD CONSTRAINT fk_menus_update_by FOREIGN KEY (updateBy) REFERENCES users(_id) ON DELETE SET NULL'
      );
      console.log('✅ updateBy字段外键约束添加成功');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ updateBy字段外键约束已存在，跳过');
      } else {
        console.log('⚠️ 添加updateBy字段外键约束失败:', error.message);
      }
    }
    
    // 6. 测试撤回菜单功能
    console.log('\n📋 测试撤回菜单功能...');
    try {
      // 创建一个测试菜单
      const testMenuId = 'test-menu-' + Date.now();
      await pool.execute(
        `INSERT INTO menus (_id, publishDate, mealType, publishStatus, publisherId, createTime, updateTime) 
         VALUES (?, '2025-09-16', 'lunch', 'published', 'test-admin', NOW(), NOW())`,
        [testMenuId]
      );
      console.log('✅ 测试菜单创建成功');
      
      // 测试撤回功能
      const [result] = await pool.execute(
        'UPDATE menus SET publishStatus = "revoked", updateTime = NOW(), updateBy = ? WHERE _id = ? AND publishStatus = "published"',
        ['test-admin', testMenuId]
      );
      
      if (result.affectedRows > 0) {
        console.log('✅ 撤回菜单功能测试成功');
      } else {
        console.log('❌ 撤回菜单功能测试失败');
      }
      
      // 清理测试数据
      await pool.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
      console.log('✅ 测试数据清理完成');
      
    } catch (error) {
      console.log('❌ 测试撤回菜单功能失败:', error.message);
    }
    
    console.log('\n🎉 menus表updateBy字段修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    logger.error('修复menus表updateBy字段失败:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixMenusUpdateBy();
}

module.exports = fixMenusUpdateBy;
