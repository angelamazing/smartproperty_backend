#!/usr/bin/env node

/**
 * 分析菜单时间存储问题
 * 用户9月17日北京时间8:55:12发布，但createTime显示为2025-09-17T00:55:12.000Z
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function analyzeMenuTimeIssue() {
  let connection;
  
  try {
    console.log('🔍 分析菜单时间存储问题...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 测试时间转换
    console.log('\n⏰ 时间转换测试:');
    
    const beijingTime = TimeUtils.getBeijingTime();
    const utcTime = TimeUtils.toUTCForStorage(beijingTime);
    
    console.log(`  当前北京时间: ${beijingTime.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`  转换为UTC时间: ${utcTime.toISOString()}`);
    console.log(`  UTC转北京时间: ${TimeUtils.toBeijingForDisplay(utcTime)}`);
    
    // 2. 模拟用户操作时间（9月17日北京时间8:55:12）
    console.log('\n🧪 模拟用户操作时间:');
    
    const userTime = '2025-09-17 08:55:12';
    const userMoment = TimeUtils.parseTime(userTime, 'YYYY-MM-DD HH:mm:ss');
    const userUTC = TimeUtils.toUTCForStorage(userMoment);
    
    console.log(`  用户操作时间: ${userTime} (北京时间)`);
    console.log(`  解析为moment: ${userMoment.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`  转换为UTC: ${userUTC.toISOString()}`);
    console.log(`  UTC转回北京时间: ${TimeUtils.toBeijingForDisplay(userUTC)}`);
    
    // 3. 检查数据库中的菜单数据
    console.log('\n📊 检查数据库中的菜单数据:');
    
    const [menus] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        publishStatus,
        createTime, 
        updateTime, 
        publishTime,
        effectiveTime
      FROM menus 
      WHERE _id = 'ddf37253-3bfe-4ae1-ac20-64b7f5e58dff'
    `);
    
    if (menus.length > 0) {
      const menu = menus[0];
      console.log('  找到菜单数据:');
      console.log(`    - 菜单ID: ${menu._id}`);
      console.log(`    - 发布日期: ${menu.publishDate}`);
      console.log(`    - 餐次类型: ${menu.mealType}`);
      console.log(`    - 发布状态: ${menu.publishStatus}`);
      console.log(`    - 创建时间: ${menu.createTime}`);
      console.log(`    - 更新时间: ${menu.updateTime}`);
      console.log(`    - 发布时间: ${menu.publishTime || 'NULL'}`);
      console.log(`    - 生效时间: ${menu.effectiveTime || 'NULL'}`);
      
      // 分析时间差
      const createTime = new Date(menu.createTime);
      const expectedTime = new Date('2025-09-17T00:55:12.000Z'); // 用户期望的UTC时间
      
      console.log('\n🔍 时间分析:');
      console.log(`    存储的UTC时间: ${createTime.toISOString()}`);
      console.log(`    期望的UTC时间: ${expectedTime.toISOString()}`);
      console.log(`    时间差: ${Math.abs(createTime.getTime() - expectedTime.getTime())}ms`);
      
      // 转换为北京时间显示
      console.log('\n🌏 北京时间显示:');
      console.log(`    存储时间转北京时间: ${TimeUtils.toBeijingForDisplay(menu.createTime)}`);
      console.log(`    期望时间转北京时间: ${TimeUtils.toBeijingForDisplay(expectedTime)}`);
    } else {
      console.log('  ❌ 没有找到指定的菜单数据');
    }
    
    // 4. 检查TimeUtils工具类的实现
    console.log('\n🛠️  检查TimeUtils实现:');
    
    console.log('  TimeUtils.toUTCForStorage 实现:');
    console.log('    - 输入: 北京时间');
    console.log('    - 处理: moment.tz(time, "Asia/Shanghai").utc().toDate()');
    console.log('    - 输出: UTC时间的Date对象');
    
    // 5. 测试不同的时间输入格式
    console.log('\n🧪 测试不同时间输入格式:');
    
    const testTimes = [
      '2025-09-17 08:55:12',
      '2025-09-17T08:55:12',
      new Date('2025-09-17T08:55:12+08:00')
    ];
    
    testTimes.forEach((time, index) => {
      console.log(`\n  测试 ${index + 1}: ${typeof time} - ${time}`);
      try {
        const utc = TimeUtils.toUTCForStorage(time);
        console.log(`    转换为UTC: ${utc.toISOString()}`);
        console.log(`    转回北京时间: ${TimeUtils.toBeijingForDisplay(utc)}`);
      } catch (error) {
        console.log(`    错误: ${error.message}`);
      }
    });
    
    // 6. 分析可能的问题
    console.log('\n🔍 可能的问题分析:');
    console.log('  1. 时间输入格式问题');
    console.log('  2. TimeUtils.toUTCForStorage 实现问题');
    console.log('  3. 数据库存储时的时区问题');
    console.log('  4. 服务器时区设置问题');
    
    // 7. 检查服务器时区设置
    console.log('\n🌍 检查服务器时区设置:');
    
    const [timezoneInfo] = await connection.execute(`
      SELECT 
        @@global.time_zone as global_tz, 
        @@session.time_zone as session_tz, 
        NOW() as current_time,
        UTC_TIMESTAMP() as utc_time
    `);
    
    console.log(`  全局时区: ${timezoneInfo[0].global_tz}`);
    console.log(`  会话时区: ${timezoneInfo[0].session_tz}`);
    console.log(`  数据库当前时间: ${timezoneInfo[0].current_time}`);
    console.log(`  数据库UTC时间: ${timezoneInfo[0].utc_time}`);
    
    // 8. 检查Node.js时区设置
    console.log('\n💻 检查Node.js时区设置:');
    console.log(`  Node.js时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`  系统当前时间: ${new Date().toISOString()}`);
    console.log(`  系统本地时间: ${new Date().toString()}`);
    
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
  analyzeMenuTimeIssue().catch(console.error);
}

module.exports = { analyzeMenuTimeIssue };
