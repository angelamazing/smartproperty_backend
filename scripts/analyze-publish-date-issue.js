#!/usr/bin/env node

/**
 * 分析 publishDate 字段时间问题
 * publishDate: "2025-09-16T16:00:00.000Z" 为什么早了16个小时
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function analyzePublishDateIssue() {
  let connection;
  
  try {
    console.log('🔍 分析 publishDate 字段时间问题...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查数据库中的菜单数据
    console.log('\n📊 检查数据库中的菜单数据:');
    
    const [menus] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        publishStatus,
        createTime, 
        updateTime
      FROM menus 
      WHERE _id = 'ddf37253-3bfe-4ae1-ac20-64b7f5e58dff'
    `);
    
    if (menus.length > 0) {
      const menu = menus[0];
      console.log('  找到菜单数据:');
      console.log(`    - 菜单ID: ${menu._id}`);
      console.log(`    - publishDate: ${menu.publishDate}`);
      console.log(`    - publishDate类型: ${typeof menu.publishDate}`);
      console.log(`    - 餐次类型: ${menu.mealType}`);
      console.log(`    - 发布状态: ${menu.publishStatus}`);
      console.log(`    - createTime: ${menu.createTime}`);
      console.log(`    - updateTime: ${menu.updateTime}`);
      
      // 分析 publishDate
      const publishDate = new Date(menu.publishDate);
      console.log('\n🔍 publishDate 分析:');
      console.log(`    原始值: ${menu.publishDate}`);
      console.log(`    Date对象: ${publishDate.toISOString()}`);
      console.log(`    转换为北京时间: ${TimeUtils.toBeijingForDisplay(publishDate)}`);
      
      // 2. 分析可能的问题
      console.log('\n🤔 问题分析:');
      
      // 如果用户选择的是9月17日，但存储的是9月16日16:00 UTC
      // 这意味着9月16日16:00 UTC = 9月17日00:00 北京时间
      const expectedDate = '2025-09-17'; // 用户期望的日期
      const actualDate = publishDate.toISOString().split('T')[0]; // 实际存储的日期
      
      console.log(`    用户期望日期: ${expectedDate}`);
      console.log(`    实际存储日期: ${actualDate}`);
      console.log(`    日期是否匹配: ${expectedDate === actualDate ? '✅ 匹配' : '❌ 不匹配'}`);
      
      // 3. 测试日期转换
      console.log('\n🧪 测试日期转换:');
      
      // 模拟前端传入的日期字符串
      const frontendDate = '2025-09-17'; // 前端传入的日期
      console.log(`    前端传入日期: ${frontendDate}`);
      
      // 直接存储到数据库会发生什么
      const directDate = new Date(frontendDate);
      console.log(`    直接new Date(): ${directDate.toISOString()}`);
      console.log(`    转换为北京时间: ${TimeUtils.toBeijingForDisplay(directDate)}`);
      
      // 使用TimeUtils处理
      const processedDate = TimeUtils.toUTCForStorage(frontendDate);
      console.log(`    TimeUtils.toUTCForStorage(): ${processedDate.toISOString()}`);
      console.log(`    转换为北京时间: ${TimeUtils.toBeijingForDisplay(processedDate)}`);
      
      // 4. 分析数据库字段类型
      console.log('\n📋 分析数据库字段类型:');
      
      const [columns] = await connection.execute(`
        DESCRIBE menus
      `);
      
      const publishDateColumn = columns.find(col => col.Field === 'publishDate');
      if (publishDateColumn) {
        console.log(`    publishDate字段类型: ${publishDateColumn.Type}`);
        console.log(`    允许NULL: ${publishDateColumn.Null}`);
        console.log(`    默认值: ${publishDateColumn.Default}`);
      }
      
      // 5. 问题根源分析
      console.log('\n🎯 问题根源分析:');
      
      // 如果前端传入 "2025-09-17"，直接存储会发生什么？
      // JavaScript的 new Date('2025-09-17') 会被解释为 UTC 时间 2025-09-17T00:00:00.000Z
      // 但MySQL的DATE类型可能会进行额外的时区转换
      
      console.log('    可能的问题:');
      console.log('    1. 前端传入的日期字符串被直接存储，没有进行时区处理');
      console.log('    2. MySQL的DATE类型在存储时进行了时区转换');
      console.log('    3. publishDate字段应该存储日期，而不是带时间的TIMESTAMP');
      
      // 6. 验证假设
      console.log('\n🔬 验证假设:');
      
      // 测试不同的日期格式
      const testDates = [
        '2025-09-17',
        '2025-09-17T00:00:00',
        '2025-09-17T00:00:00+08:00',
        '2025-09-17T08:00:00+08:00'
      ];
      
      testDates.forEach((dateStr, index) => {
        console.log(`\n    测试 ${index + 1}: "${dateStr}"`);
        const testDate = new Date(dateStr);
        console.log(`      new Date(): ${testDate.toISOString()}`);
        console.log(`      北京时间: ${TimeUtils.toBeijingForDisplay(testDate)}`);
        
        // 如果使用TimeUtils处理
        try {
          const utcDate = TimeUtils.toUTCForStorage(dateStr);
          console.log(`      TimeUtils.toUTCForStorage(): ${utcDate.toISOString()}`);
          console.log(`      北京时间: ${TimeUtils.toBeijingForDisplay(utcDate)}`);
        } catch (error) {
          console.log(`      TimeUtils.toUTCForStorage(): 错误 - ${error.message}`);
        }
      });
      
    } else {
      console.log('  ❌ 没有找到指定的菜单数据');
    }
    
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error);
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

// 运行分析
if (require.main === module) {
  analyzePublishDateIssue().catch(console.error);
}

module.exports = { analyzePublishDateIssue };
