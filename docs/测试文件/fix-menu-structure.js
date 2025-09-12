const mysql = require('mysql2/promise');
const config = require('./config/database');

async function fixMenuStructure() {
  let connection;
  
  try {
    console.log('🔧 修复菜单表结构...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查menus表是否缺少name字段
    console.log('\n📋 检查menus表字段');
    try {
      const [columns] = await connection.execute('DESCRIBE menus');
      const fieldNames = columns.map(col => col.Field);
      console.log('当前字段:', fieldNames);
      
      if (!fieldNames.includes('name')) {
        console.log('❌ 缺少name字段，正在添加...');
        await connection.execute('ALTER TABLE menus ADD COLUMN name VARCHAR(100) COMMENT "菜单名称"');
        console.log('✅ name字段添加成功');
      } else {
        console.log('✅ name字段已存在');
      }
      
      if (!fieldNames.includes('description')) {
        console.log('❌ 缺少description字段，正在添加...');
        await connection.execute('ALTER TABLE menus ADD COLUMN description TEXT COMMENT "菜单描述"');
        console.log('✅ description字段添加成功');
      } else {
        console.log('✅ description字段已存在');
      }
      
    } catch (error) {
      console.log('❌ 修复表结构失败:', error.message);
    }
    
    // 更新现有菜单的名称
    console.log('\n📋 更新现有菜单名称');
    try {
      const [menus] = await connection.execute('SELECT _id, publishDate, mealType FROM menus WHERE name IS NULL OR name = ""');
      console.log('需要更新名称的菜单数量:', menus.length);
      
      for (const menu of menus) {
        const menuName = `${menu.publishDate.split('T')[0]} ${menu.mealType === 'breakfast' ? '早餐' : menu.mealType === 'lunch' ? '午餐' : '晚餐'}菜单`;
        
        await connection.execute('UPDATE menus SET name = ? WHERE _id = ?', [menuName, menu._id]);
        console.log(`✅ 更新菜单 ${menu._id}: ${menuName}`);
      }
    } catch (error) {
      console.log('❌ 更新菜单名称失败:', error.message);
    }
    
    // 验证修复结果
    console.log('\n📋 验证修复结果');
    try {
      const [menus] = await connection.execute('SELECT _id, name, publishDate, mealType, publishStatus FROM menus LIMIT 3');
      console.log('修复后的菜单数据:');
      menus.forEach((menu, index) => {
        console.log(`  ${index + 1}. ID: ${menu._id}, 名称: ${menu.name}, 日期: ${menu.publishDate}, 类型: ${menu.mealType}, 状态: ${menu.publishStatus}`);
      });
    } catch (error) {
      console.log('❌ 验证失败:', error.message);
    }
    
    console.log('\n🎉 修复完成！');
    
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
fixMenuStructure();
