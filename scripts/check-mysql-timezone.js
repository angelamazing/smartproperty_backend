#!/usr/bin/env node

/**
 * 检查MySQL时区设置
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkMySQLTimezone() {
  let connection;
  
  try {
    console.log('🌍 检查MySQL时区设置...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查MySQL时区设置
    console.log('\n📋 MySQL时区信息:');
    
    // 分别查询时区信息
    const [globalTz] = await connection.execute(`SELECT @@global.time_zone as tz`);
    const [sessionTz] = await connection.execute(`SELECT @@session.time_zone as tz`);
    const [currentTime] = await connection.execute(`SELECT NOW() as current_time`);
    const [utcTime] = await connection.execute(`SELECT UTC_TIMESTAMP() as utc_time`);
    
    console.log(`  全局时区: ${globalTz[0].tz}`);
    console.log(`  会话时区: ${sessionTz[0].tz}`);
    console.log(`  数据库当前时间: ${currentTime[0].current_time}`);
    console.log(`  数据库UTC时间: ${utcTime[0].utc_time}`);
    
    // 2. 测试日期存储
    console.log('\n🧪 测试日期存储行为:');
    
    const testDate = '2025-09-17';
    console.log(`  测试日期字符串: ${testDate}`);
    
    // 创建临时表测试
    await connection.execute(`
      CREATE TEMPORARY TABLE test_date_storage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date_field DATE,
        timestamp_field TIMESTAMP,
        datetime_field DATETIME
      )
    `);
    
    // 插入测试数据
    await connection.execute(`
      INSERT INTO test_date_storage (date_field, timestamp_field, datetime_field) 
      VALUES (?, ?, ?)
    `, [testDate, testDate, testDate]);
    
    // 查询结果
    const [results] = await connection.execute(`
      SELECT 
        date_field, 
        timestamp_field, 
        datetime_field,
        UNIX_TIMESTAMP(date_field) as date_timestamp,
        UNIX_TIMESTAMP(timestamp_field) as timestamp_timestamp,
        UNIX_TIMESTAMP(datetime_field) as datetime_timestamp
      FROM test_date_storage
    `);
    
    if (results.length > 0) {
      const result = results[0];
      console.log('\n📊 存储结果:');
      console.log(`  DATE字段: ${result.date_field}`);
      console.log(`  TIMESTAMP字段: ${result.timestamp_field}`);
      console.log(`  DATETIME字段: ${result.datetime_field}`);
      console.log(`  DATE时间戳: ${result.date_timestamp}`);
      console.log(`  TIMESTAMP时间戳: ${result.timestamp_timestamp}`);
      console.log(`  DATETIME时间戳: ${result.datetime_timestamp}`);
    }
    
    // 3. 分析问题
    console.log('\n🔍 问题分析:');
    
    // 如果MySQL服务器时区是UTC，那么：
    // - 存储 '2025-09-17' 到DATE字段会正常存储为 2025-09-17
    // - 但存储到TIMESTAMP字段会被解释为UTC时间，然后根据时区转换
    
    // 4. 测试不同的存储方式
    console.log('\n🧪 测试不同的存储方式:');
    
    // 清理临时表
    await connection.execute('DROP TEMPORARY TABLE test_date_storage');
    
    // 重新创建临时表
    await connection.execute(`
      CREATE TEMPORARY TABLE test_date_storage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date_field DATE,
        timestamp_field TIMESTAMP,
        datetime_field DATETIME
      )
    `);
    
    // 测试不同的日期格式
    const testDates = [
      '2025-09-17',
      '2025-09-17 00:00:00',
      '2025-09-17 08:00:00',
      '2025-09-17T00:00:00',
      '2025-09-17T08:00:00'
    ];
    
    for (let i = 0; i < testDates.length; i++) {
      const testDateStr = testDates[i];
      console.log(`\n  测试 ${i + 1}: "${testDateStr}"`);
      
      try {
        await connection.execute(`
          INSERT INTO test_date_storage (date_field, timestamp_field, datetime_field) 
          VALUES (?, ?, ?)
        `, [testDateStr, testDateStr, testDateStr]);
        
        const [testResults] = await connection.execute(`
          SELECT 
            date_field, 
            timestamp_field, 
            datetime_field
          FROM test_date_storage 
          WHERE id = LAST_INSERT_ID()
        `);
        
        if (testResults.length > 0) {
          const testResult = testResults[0];
          console.log(`    DATE: ${testResult.date_field}`);
          console.log(`    TIMESTAMP: ${testResult.timestamp_field}`);
          console.log(`    DATETIME: ${testResult.datetime_field}`);
        }
        
        // 清理数据
        await connection.execute('DELETE FROM test_date_storage WHERE id = LAST_INSERT_ID()');
        
      } catch (error) {
        console.log(`    错误: ${error.message}`);
      }
    }
    
    // 5. 解决方案建议
    console.log('\n💡 解决方案建议:');
    console.log('  1. 确保publishDate字段使用DATE类型而不是TIMESTAMP');
    console.log('  2. 在插入时明确指定时区信息');
    console.log('  3. 或者使用字符串格式存储日期');
    console.log('  4. 检查MySQL服务器的时区设置');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
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

// 运行检查
if (require.main === module) {
  checkMySQLTimezone().catch(console.error);
}

module.exports = { checkMySQLTimezone };
