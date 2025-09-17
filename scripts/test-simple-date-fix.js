#!/usr/bin/env node

/**
 * 简单测试日期修复
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testSimpleDateFix() {
  let connection;
  
  try {
    console.log('🧪 简单测试日期修复...\n');
    
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 测试直接存储日期字符串
    console.log('\n📝 测试直接存储日期字符串:');
    
    const testMenuId = require('uuid').v4();
    const userDate = '2025-12-25'; // 使用圣诞节日期避免重复
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    console.log(`  用户选择日期: ${userDate}`);
    
    // 直接存储日期字符串（修复后的方式）
    await connection.execute(
      'INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testMenuId, userDate, 'breakfast', '测试直接存储', 'draft', now, now]
    );
    
    console.log('  ✅ 菜单创建成功');
    
    // 2. 查询并验证结果
    console.log('\n🔍 查询并验证结果:');
    
    const [results] = await connection.execute(`
      SELECT 
        _id,
        publishDate,
        DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (results.length > 0) {
      const menu = results[0];
      
      console.log('📋 查询结果:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate: ${menu.publishDate}`);
      console.log(`  - 格式化日期: ${menu.formatted_date}`);
      
      // 验证结果
      console.log('\n✅ 验证结果:');
      console.log(`  用户选择日期: ${userDate}`);
      console.log(`  数据库存储日期: ${menu.formatted_date}`);
      console.log(`  日期匹配: ${userDate === menu.formatted_date ? '✅ 正确' : '❌ 错误'}`);
      
      if (userDate === menu.formatted_date) {
        console.log('\n🎉 日期修复成功！');
        console.log('  - 直接存储日期字符串的方式正确');
        console.log('  - 用户选择的日期正确存储和显示');
      } else {
        console.log('\n❌ 日期修复失败！');
        console.log('  - 需要进一步检查存储逻辑');
      }
      
    } else {
      console.log('❌ 没有找到查询结果');
    }
    
    // 3. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
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

// 运行测试
if (require.main === module) {
  testSimpleDateFix().catch(console.error);
}

module.exports = { testSimpleDateFix };
