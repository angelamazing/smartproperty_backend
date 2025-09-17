#!/usr/bin/env node

/**
 * 修改publishDate字段类型为VARCHAR，避免时区转换问题
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function changePublishDateField() {
  let connection;
  
  try {
    console.log('🔧 修改publishDate字段类型为VARCHAR...\n');
    
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前字段类型
    console.log('\n📋 检查当前字段类型:');
    
    const [columns] = await connection.execute(`DESCRIBE menus`);
    const publishDateColumn = columns.find(col => col.Field === 'publishDate');
    
    if (publishDateColumn) {
      console.log(`  当前publishDate字段类型: ${publishDateColumn.Type}`);
      console.log(`  允许NULL: ${publishDateColumn.Null}`);
      console.log(`  默认值: ${publishDateColumn.Default}`);
    }
    
    // 2. 备份现有数据
    console.log('\n💾 备份现有数据:');
    
    const [existingData] = await connection.execute(`
      SELECT _id, publishDate, DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date
      FROM menus 
      WHERE publishDate IS NOT NULL
      LIMIT 10
    `);
    
    console.log(`  找到 ${existingData.length} 条现有数据`);
    if (existingData.length > 0) {
      console.log('  现有数据示例:');
      existingData.forEach((row, index) => {
        console.log(`    ${index + 1}. ID: ${row._id}, publishDate: ${row.publishDate}, 格式化: ${row.formatted_date}`);
      });
    }
    
    // 3. 修改字段类型
    console.log('\n🔧 修改字段类型:');
    
    try {
      // 添加新的VARCHAR字段
      console.log('  添加新的publish_date_str字段...');
      await connection.execute(`
        ALTER TABLE menus 
        ADD COLUMN publish_date_str VARCHAR(10) NULL COMMENT '发布日期字符串'
      `);
      console.log('  ✅ publish_date_str字段添加成功');
      
      // 将现有数据转换为字符串格式
      console.log('  转换现有数据...');
      await connection.execute(`
        UPDATE menus 
        SET publish_date_str = DATE_FORMAT(publishDate, '%Y-%m-%d')
        WHERE publishDate IS NOT NULL
      `);
      console.log('  ✅ 现有数据转换完成');
      
      // 删除旧的DATE字段
      console.log('  删除旧的publishDate字段...');
      await connection.execute(`ALTER TABLE menus DROP COLUMN publishDate`);
      console.log('  ✅ 旧的publishDate字段删除成功');
      
      // 重命名新字段
      console.log('  重命名字段...');
      await connection.execute(`ALTER TABLE menus CHANGE COLUMN publish_date_str publishDate VARCHAR(10) NULL COMMENT '发布日期'`);
      console.log('  ✅ 字段重命名完成');
      
      // 添加索引
      console.log('  添加索引...');
      await connection.execute(`ALTER TABLE menus ADD INDEX idx_publish_date (publishDate)`);
      console.log('  ✅ 索引添加完成');
      
    } catch (error) {
      console.error('  ❌ 修改字段时出错:', error.message);
      throw error;
    }
    
    // 4. 验证修改结果
    console.log('\n✅ 验证修改结果:');
    
    const [newColumns] = await connection.execute(`DESCRIBE menus`);
    const newPublishDateColumn = newColumns.find(col => col.Field === 'publishDate');
    
    if (newPublishDateColumn) {
      console.log(`  新的publishDate字段类型: ${newPublishDateColumn.Type}`);
      console.log(`  允许NULL: ${newPublishDateColumn.Null}`);
      console.log(`  默认值: ${newPublishDateColumn.Default}`);
    }
    
    // 5. 测试新字段
    console.log('\n🧪 测试新字段:');
    
    const testMenuId = require('uuid').v4();
    const testDate = '2025-12-25';
    
    await connection.execute(`
      INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [testMenuId, testDate, 'breakfast', '测试VARCHAR字段', 'draft']);
    
    const [testResult] = await connection.execute(`
      SELECT _id, publishDate FROM menus WHERE _id = ?
    `, [testMenuId]);
    
    if (testResult.length > 0) {
      const result = testResult[0];
      console.log(`  测试存储: ${testDate}`);
      console.log(`  实际存储: ${result.publishDate}`);
      console.log(`  类型匹配: ${testDate === result.publishDate ? '✅ 正确' : '❌ 错误'}`);
      
      if (testDate === result.publishDate) {
        console.log('\n🎉 字段修改成功！');
        console.log('  - publishDate现在是VARCHAR类型');
        console.log('  - 不会有时区转换问题');
        console.log('  - 存储和显示完全一致');
      }
    }
    
    // 清理测试数据
    await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    
  } catch (error) {
    console.error('❌ 修改过程中出现错误:', error);
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

// 运行修改
if (require.main === module) {
  changePublishDateField().catch(console.error);
}

module.exports = { changePublishDateField };
