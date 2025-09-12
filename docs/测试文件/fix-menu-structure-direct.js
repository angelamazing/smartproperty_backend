const mysql = require('mysql2/promise');
const config = require('./config/database');

async function fixMenuStructureDirect() {
  let connection;
  
  try {
    console.log('🔧 直接修复菜单表结构...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 添加name字段
    console.log('\n📋 步骤1: 添加name字段');
    try {
      await connection.execute('ALTER TABLE menus ADD COLUMN IF NOT EXISTS name VARCHAR(100) COMMENT "菜单名称"');
      console.log('✅ name字段添加成功');
    } catch (error) {
      console.log('⚠️ name字段可能已存在:', error.message);
    }
    
    // 2. 添加description字段
    console.log('\n📋 步骤2: 添加description字段');
    try {
      await connection.execute('ALTER TABLE menus ADD COLUMN IF NOT EXISTS description TEXT COMMENT "菜单描述"');
      console.log('✅ description字段添加成功');
    } catch (error) {
      console.log('⚠️ description字段可能已存在:', error.message);
    }
    
    // 3. 更新现有菜单的名称
    console.log('\n📋 步骤3: 更新现有菜单名称');
    try {
      const [result] = await connection.execute(`
        UPDATE menus 
        SET name = CONCAT(
          DATE_FORMAT(publishDate, '%Y-%m-%d'), ' ',
          CASE mealType 
            WHEN 'breakfast' THEN '早餐' 
            WHEN 'lunch' THEN '午餐' 
            WHEN 'dinner' THEN '晚餐'
            ELSE '餐食'
          END, '菜单'
        ) 
        WHERE name IS NULL OR name = ''
      `);
      console.log(`✅ 更新了 ${result.affectedRows} 个菜单的名称`);
    } catch (error) {
      console.log('❌ 更新菜单名称失败:', error.message);
    }
    
    // 4. 验证修复结果
    console.log('\n📋 步骤4: 验证修复结果');
    try {
      const [menus] = await connection.execute('SELECT _id, name, publishDate, mealType, publishStatus FROM menus LIMIT 5');
      console.log('修复后的菜单数据:');
      menus.forEach((menu, index) => {
        console.log(`  ${index + 1}. ID: ${menu._id}, 名称: ${menu.name}, 日期: ${menu.publishDate}, 类型: ${menu.mealType}, 状态: ${menu.publishStatus}`);
      });
    } catch (error) {
      console.log('❌ 验证失败:', error.message);
    }
    
    console.log('\n🎉 数据库结构修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行修复
fixMenuStructureDirect();
