#!/usr/bin/env node

/**
 * 清理重复的菜品分类数据
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function cleanupDuplicateCategories() {
  let connection;
  
  try {
    console.log('🧹 开始清理重复的菜品分类数据...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 查看当前分类数据
    console.log('\n📂 当前分类数据:');
    
    const [categories] = await connection.execute(`
      SELECT _id, name, description, createTime 
      FROM dish_categories 
      ORDER BY name, createTime ASC
    `);
    
    console.log(`  总共 ${categories.length} 个分类:`);
    categories.forEach((category, index) => {
      console.log(`    ${index + 1}. ${category.name} - ${category.description || 'N/A'} - ${category.createTime}`);
    });
    
    // 2. 查找重复的分类
    console.log('\n🔍 查找重复的分类...');
    
    const [duplicates] = await connection.execute(`
      SELECT name, COUNT(*) as count, GROUP_CONCAT(_id ORDER BY createTime ASC) as ids
      FROM dish_categories 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log(`  找到 ${duplicates.length} 个重复分类:`);
      duplicates.forEach((dup, index) => {
        console.log(`    ${index + 1}. ${dup.name} (${dup.count} 个重复)`);
        console.log(`       保留最早的ID: ${dup.ids.split(',')[0]}`);
        console.log(`       删除其他ID: ${dup.ids.split(',').slice(1).join(', ')}`);
      });
      
      // 3. 删除重复的分类（保留最早的）
      console.log('\n🗑️  删除重复分类...');
      
      for (const dup of duplicates) {
        const ids = dup.ids.split(',');
        const keepId = ids[0]; // 保留最早的
        const deleteIds = ids.slice(1); // 删除其他的
        
        console.log(`  📝 处理分类: ${dup.name}`);
        console.log(`    保留: ${keepId}`);
        console.log(`    删除: ${deleteIds.join(', ')}`);
        
        // 删除重复的分类
        for (const deleteId of deleteIds) {
          await connection.execute(`
            DELETE FROM dish_categories 
            WHERE _id = ?
          `, [deleteId]);
        }
        
        console.log(`    ✅ 删除了 ${deleteIds.length} 个重复分类`);
      }
    } else {
      console.log('  ✅ 没有找到重复的分类');
    }
    
    // 4. 清理测试分类
    console.log('\n🗑️  清理测试分类...');
    
    const [testCategoryResult] = await connection.execute(`
      DELETE FROM dish_categories 
      WHERE name LIKE '%测试%' 
      OR name LIKE '%test%'
      OR description LIKE '%测试%'
    `);
    console.log(`  ✅ 删除了 ${testCategoryResult.affectedRows} 个测试分类`);
    
    // 5. 查看清理后的分类数据
    console.log('\n📂 清理后的分类数据:');
    
    const [finalCategories] = await connection.execute(`
      SELECT _id, name, description, createTime 
      FROM dish_categories 
      ORDER BY name, createTime ASC
    `);
    
    console.log(`  总共 ${finalCategories.length} 个分类:`);
    finalCategories.forEach((category, index) => {
      console.log(`    ${index + 1}. ${category.name} - ${category.description || 'N/A'}`);
    });
    
    console.log('\n🎉 重复分类清理完成！');
    
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行清理
if (require.main === module) {
  cleanupDuplicateCategories().catch(console.error);
}

module.exports = { cleanupDuplicateCategories };
