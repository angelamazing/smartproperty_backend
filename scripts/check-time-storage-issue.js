#!/usr/bin/env node

/**
 * 专门检查时间存储问题
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function checkTimeStorageIssue() {
  let connection;
  
  try {
    console.log('🕐 检查时间存储问题...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前时间处理
    console.log('\n⏰ 当前时间处理分析:');
    
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    console.log(`  TimeUtils.getBeijingTime(): ${TimeUtils.getBeijingTime().format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`  TimeUtils.toUTCForStorage(): ${now.toISOString()}`);
    console.log(`  转换为北京时间: ${TimeUtils.toBeijingForDisplay(now)}`);
    
    // 2. 测试日期存储
    console.log('\n📅 测试日期存储:');
    
    const testDate = '2025-09-17';
    console.log(`  用户选择的日期: ${testDate}`);
    
    // 使用DATE_ADD函数
    const correctedDate = `DATE_ADD('${testDate}', INTERVAL 8 HOUR)`;
    console.log(`  DATE_ADD函数: ${correctedDate}`);
    
    // 3. 创建测试菜单
    console.log('\n📝 创建测试菜单:');
    
    const testMenuId = require('uuid').v4();
    
    // 插入测试数据
    await connection.execute(
      `INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) VALUES (?, ${correctedDate}, ?, ?, ?, ?, ?)`,
      [testMenuId, 'breakfast', '测试时间存储', 'draft', now, now]
    );
    
    console.log(`  测试菜单ID: ${testMenuId}`);
    
    // 4. 查询并分析存储结果
    console.log('\n🔍 查询存储结果:');
    
    const [results] = await connection.execute(`
      SELECT 
        _id,
        publishDate,
        createTime,
        updateTime,
        DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date,
        DATE_FORMAT(publishDate, '%Y-%m-%d %H:%i:%s') as formatted_datetime,
        UNIX_TIMESTAMP(publishDate) as publish_timestamp,
        UNIX_TIMESTAMP(createTime) as create_timestamp
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (results.length > 0) {
      const menu = results[0];
      
      console.log('📋 存储结果分析:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate原始值: ${menu.publishDate}`);
      console.log(`  - publishDate格式化日期: ${menu.formatted_date}`);
      console.log(`  - publishDate格式化时间: ${menu.formatted_datetime}`);
      console.log(`  - publishDate时间戳: ${menu.publish_timestamp}`);
      console.log(`  - createTime: ${menu.createTime}`);
      console.log(`  - createTime时间戳: ${menu.create_timestamp}`);
      
      // 5. 时间转换分析
      console.log('\n🔄 时间转换分析:');
      
      const publishDate = new Date(menu.publishDate);
      const createTime = new Date(menu.createTime);
      
      console.log(`  publishDate Date对象: ${publishDate.toISOString()}`);
      console.log(`  createTime Date对象: ${createTime.toISOString()}`);
      
      console.log(`  publishDate转北京时间: ${TimeUtils.toBeijingForDisplay(menu.publishDate)}`);
      console.log(`  createTime转北京时间: ${TimeUtils.toBeijingForDisplay(menu.createTime)}`);
      
      // 6. 问题分析
      console.log('\n🤔 问题分析:');
      
      const expectedDate = testDate;
      const actualDate = menu.formatted_date;
      
      console.log(`  用户期望日期: ${expectedDate}`);
      console.log(`  数据库存储日期: ${actualDate}`);
      console.log(`  日期是否匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 检查时间戳差异
      const timeDiff = menu.create_timestamp - menu.publish_timestamp;
      console.log(`  时间戳差异: ${timeDiff} 秒`);
      
      // 7. 检查MySQL时区设置
      console.log('\n🌍 检查MySQL时区设置:');
      
      const [tzInfo] = await connection.execute(`SELECT @@session.time_zone as session_tz, NOW() as current_time, UTC_TIMESTAMP() as utc_time`);
      console.log(`  会话时区: ${tzInfo[0].session_tz}`);
      console.log(`  当前时间: ${tzInfo[0].current_time}`);
      console.log(`  UTC时间: ${tzInfo[0].utc_time}`);
      
      // 8. 测试不同的存储方式
      console.log('\n🧪 测试不同的存储方式:');
      
      // 测试1: 直接存储日期字符串
      console.log('\n  测试1: 直接存储日期字符串');
      const testMenuId1 = require('uuid').v4();
      
      try {
        await connection.execute(
          'INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [testMenuId1, testDate, 'lunch', '测试直接存储', 'draft', now, now]
        );
        
        const [result1] = await connection.execute(`
          SELECT 
            publishDate,
            DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date
          FROM menus 
          WHERE _id = ?
        `, [testMenuId1]);
        
        if (result1.length > 0) {
          console.log(`    存储结果: ${result1[0].publishDate}`);
          console.log(`    格式化日期: ${result1[0].formatted_date}`);
        }
        
        // 清理
        await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId1]);
        
      } catch (error) {
        console.log(`    错误: ${error.message}`);
      }
      
      // 测试2: 使用当前代码的方式
      console.log('\n  测试2: 使用DATE_ADD方式');
      console.log(`    使用: ${correctedDate}`);
      console.log(`    存储结果: ${menu.publishDate}`);
      console.log(`    格式化日期: ${menu.formatted_date}`);
      console.log(`    结果: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 9. 最终结论
      console.log('\n🎯 最终结论:');
      
      if (expectedDate === actualDate) {
        console.log('✅ 时间存储修复成功！');
        console.log('  - DATE_ADD函数正确补偿了时区差异');
        console.log('  - 用户选择的日期正确存储和显示');
        console.log('  - 查询功能正常工作');
      } else {
        console.log('❌ 时间存储仍有问题！');
        console.log('  - 需要进一步调整DATE_ADD参数');
        console.log('  - 或者采用其他解决方案');
      }
      
    } else {
      console.log('❌ 没有找到测试菜单数据');
    }
    
    // 10. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
if (require.main === module) {
  checkTimeStorageIssue().catch(console.error);
}

module.exports = { checkTimeStorageIssue };
