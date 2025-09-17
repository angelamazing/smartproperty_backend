#!/usr/bin/env node

/**
 * 快速清理重复的菜品分类
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function quickCleanupCategories() {
  let connection;
  
  try {
    console.log('🧹 快速清理重复分类...\n');
    
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 查看当前分类
    const [categories] = await connection.execute(`
      SELECT _id, name, description, createTime 
      FROM dish_categories 
      ORDER BY name, createTime ASC
    `);
    
    console.log(`📂 当前分类数量: ${categories.length}`);
    
    // 删除测试分类
    const [testResult] = await connection.execute(`
      DELETE FROM dish_categories 
      WHERE name LIKE '%测试%' 
      OR name LIKE '%test%'
      OR description LIKE '%测试%'
    `);
    console.log(`✅ 删除了 ${testResult.affectedRows} 个测试分类`);
    
    // 删除重复分类（保留最早的）
    const [dupResult] = await connection.execute(`
      DELETE dc1 FROM dish_categories dc1
      INNER JOIN dish_categories dc2 
      WHERE dc1.name = dc2.name 
      AND dc1.createTime > dc2.createTime
    `);
    console.log(`✅ 删除了 ${dupResult.affectedRows} 个重复分类`);
    
    // 查看最终结果
    const [finalCategories] = await connection.execute(`
      SELECT _id, name, description 
      FROM dish_categories 
      ORDER BY name ASC
    `);
    
    console.log(`\n📂 清理后分类数量: ${finalCategories.length}`);
    finalCategories.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.name} - ${category.description || 'N/A'}`);
    });
    
    console.log('\n🎉 分类清理完成！');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行清理
if (require.main === module) {
  quickCleanupCategories().catch(console.error);
}
