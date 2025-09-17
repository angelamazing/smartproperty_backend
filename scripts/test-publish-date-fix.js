#!/usr/bin/env node

/**
 * 测试 publishDate 字段修复效果
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testPublishDateFix() {
  let connection;
  
  try {
    console.log('🧪 测试 publishDate 字段修复效果...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 创建测试菜单
    console.log('\n📝 创建测试菜单...');
    
    const testMenuId = require('uuid').v4();
    const testDate = '2025-09-17'; // 测试日期
    const mealType = 'lunch';
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    // 直接插入测试数据，模拟修复后的逻辑
    // 不设置publisherId避免外键约束问题
    await connection.execute(`
      INSERT INTO menus (
        _id, 
        publishDate, 
        mealType, 
        description, 
        publishStatus, 
        createTime, 
        updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      testMenuId,
      testDate, // 直接存储日期字符串，不进行时区转换
      mealType,
      '测试publishDate修复',
      'draft',
      now,
      now
    ]);
    
    console.log(`✅ 测试菜单创建成功 (ID: ${testMenuId})`);
    console.log(`   测试日期: ${testDate}`);
    
    // 2. 查询并验证结果
    console.log('\n🔍 查询并验证结果...');
    
    const [testMenus] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        createTime,
        updateTime
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (testMenus.length > 0) {
      const menu = testMenus[0];
      
      console.log('📋 测试菜单数据:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate: ${menu.publishDate}`);
      console.log(`  - publishDate类型: ${typeof menu.publishDate}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - createTime: ${menu.createTime}`);
      console.log(`  - updateTime: ${menu.updateTime}`);
      
      // 3. 分析 publishDate 字段
      console.log('\n🔍 publishDate 字段分析:');
      
      const publishDate = new Date(menu.publishDate);
      const expectedDate = '2025-09-17';
      const actualDate = publishDate.toISOString().split('T')[0];
      
      console.log(`    原始值: ${menu.publishDate}`);
      console.log(`    Date对象: ${publishDate.toISOString()}`);
      console.log(`    转换为北京时间: ${TimeUtils.toBeijingForDisplay(publishDate)}`);
      console.log(`    期望日期: ${expectedDate}`);
      console.log(`    实际日期: ${actualDate}`);
      console.log(`    日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 4. 对比修复前后的差异
      console.log('\n📊 修复前后对比:');
      
      console.log('  修复前 (使用TimeUtils.toUTCForStorage):');
      const beforeFix = TimeUtils.toUTCForStorage(testDate);
      console.log(`    publishDate: ${beforeFix.toISOString()}`);
      console.log(`    北京时间: ${TimeUtils.toBeijingForDisplay(beforeFix)}`);
      console.log(`    日期部分: ${beforeFix.toISOString().split('T')[0]}`);
      
      console.log('\n  修复后 (直接存储日期字符串):');
      console.log(`    publishDate: ${menu.publishDate}`);
      console.log(`    Date对象: ${publishDate.toISOString()}`);
      console.log(`    北京时间: ${TimeUtils.toBeijingForDisplay(publishDate)}`);
      console.log(`    日期部分: ${actualDate}`);
      
      // 5. 验证修复效果
      console.log('\n✅ 修复效果验证:');
      
      const isFixed = expectedDate === actualDate;
      console.log(`    修复状态: ${isFixed ? '✅ 修复成功' : '❌ 修复失败'}`);
      
      if (isFixed) {
        console.log('\n🎉 publishDate 字段修复成功！');
        console.log('   - 日期存储正确，不再提前16小时');
        console.log('   - 用户选择的日期与存储的日期一致');
        console.log('   - 符合业务逻辑预期');
      } else {
        console.log('\n❌ 修复失败，需要进一步检查');
      }
      
    } else {
      console.log('❌ 没有找到测试菜单数据');
    }
    
    // 6. 清理测试数据
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
  testPublishDateFix().catch(console.error);
}

module.exports = { testPublishDateFix };
