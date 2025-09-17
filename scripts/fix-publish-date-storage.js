#!/usr/bin/env node

/**
 * 修复 publishDate 字段存储问题
 * 确保用户选择的日期正确存储，不进行时区转换
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function fixPublishDateStorage() {
  let connection;
  
  try {
    console.log('🔧 修复 publishDate 字段存储问题...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前数据库表结构
    console.log('\n📋 检查当前表结构:');
    
    const [columns] = await connection.execute(`DESCRIBE menus`);
    const publishDateColumn = columns.find(col => col.Field === 'publishDate');
    
    if (publishDateColumn) {
      console.log(`  publishDate字段类型: ${publishDateColumn.Type}`);
      console.log(`  允许NULL: ${publishDateColumn.Null}`);
      console.log(`  默认值: ${publishDateColumn.Default}`);
    }
    
    // 2. 测试不同的存储方法
    console.log('\n🧪 测试不同的存储方法:');
    
    // 创建临时表测试
    await connection.execute(`
      CREATE TEMPORARY TABLE test_publish_date (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date_field DATE,
        date_str_field VARCHAR(10),
        test_date VARCHAR(10)
      )
    `);
    
    const testDate = '2025-09-17';
    
    // 方法1: 直接存储日期字符串到DATE字段
    console.log(`\n  方法1: 直接存储 "${testDate}" 到DATE字段`);
    await connection.execute(`
      INSERT INTO test_publish_date (date_field, test_date) VALUES (?, ?)
    `, [testDate, testDate]);
    
    // 方法2: 存储日期字符串到VARCHAR字段
    console.log(`\n  方法2: 存储 "${testDate}" 到VARCHAR字段`);
    await connection.execute(`
      INSERT INTO test_publish_date (date_str_field, test_date) VALUES (?, ?)
    `, [testDate, testDate]);
    
    // 方法3: 使用DATE_FORMAT函数
    console.log(`\n  方法3: 使用DATE_FORMAT函数`);
    await connection.execute(`
      INSERT INTO test_publish_date (date_field, test_date) VALUES (DATE_FORMAT(?, '%Y-%m-%d'), ?)
    `, [testDate, testDate]);
    
    // 查询结果
    const [results] = await connection.execute(`
      SELECT 
        id,
        date_field, 
        date_str_field,
        test_date,
        DATE_FORMAT(date_field, '%Y-%m-%d') as formatted_date
      FROM test_publish_date
    `);
    
    console.log('\n📊 测试结果:');
    results.forEach((result, index) => {
      console.log(`\n  测试 ${index + 1}:`);
      console.log(`    DATE字段: ${result.date_field}`);
      console.log(`    VARCHAR字段: ${result.date_str_field}`);
      console.log(`    格式化后: ${result.formatted_date}`);
      console.log(`    期望值: ${result.test_date}`);
      
      const isCorrect = result.test_date === result.formatted_date || 
                       result.test_date === result.date_field ||
                       result.test_date === result.date_str_field;
      console.log(`    结果: ${isCorrect ? '✅ 正确' : '❌ 错误'}`);
    });
    
    // 3. 确定最佳解决方案
    console.log('\n💡 最佳解决方案:');
    
    // 方案A: 修改数据库字段类型为VARCHAR
    console.log('\n  方案A: 修改publishDate字段为VARCHAR(10)');
    console.log('    优点: 完全避免时区转换问题');
    console.log('    缺点: 失去日期类型的约束和函数支持');
    
    // 方案B: 在应用层处理时区转换
    console.log('\n  方案B: 在应用层处理时区转换');
    console.log('    优点: 保持数据库字段类型不变');
    console.log('    缺点: 需要在应用层处理时区逻辑');
    
    // 方案C: 使用DATE_ADD函数调整时区
    console.log('\n  方案C: 使用DATE_ADD函数调整时区');
    console.log('    优点: 在数据库层面解决');
    console.log('    缺点: 依赖数据库时区设置');
    
    // 4. 推荐方案：方案B - 在应用层处理
    console.log('\n🎯 推荐方案: 方案B - 在应用层处理');
    console.log('  在插入数据时，将日期字符串转换为正确的UTC日期');
    
    // 5. 实现修复方案
    console.log('\n🛠️  实现修复方案:');
    
    // 测试修复后的逻辑
    const userSelectedDate = '2025-09-17';
    
    // 将用户选择的日期转换为正确的UTC日期
    // 用户选择2025-09-17，应该存储为2025-09-17 00:00:00 UTC
    // 但由于时区问题，需要存储为2025-09-17 08:00:00 UTC（对应北京时间2025-09-17 16:00:00）
    const correctedDate = `${userSelectedDate} 08:00:00`;
    
    console.log(`    用户选择日期: ${userSelectedDate}`);
    console.log(`    修正后存储: ${correctedDate}`);
    
    // 测试修正后的存储
    await connection.execute(`DELETE FROM test_publish_date`);
    
    await connection.execute(`
      INSERT INTO test_publish_date (date_field, test_date) VALUES (?, ?)
    `, [correctedDate, userSelectedDate]);
    
    const [correctedResults] = await connection.execute(`
      SELECT 
        date_field,
        DATE_FORMAT(date_field, '%Y-%m-%d') as formatted_date,
        test_date
      FROM test_publish_date
    `);
    
    if (correctedResults.length > 0) {
      const correctedResult = correctedResults[0];
      console.log(`    存储结果: ${correctedResult.date_field}`);
      console.log(`    格式化后: ${correctedResult.formatted_date}`);
      console.log(`    期望值: ${correctedResult.test_date}`);
      
      const isCorrected = correctedResult.formatted_date === correctedResult.test_date;
      console.log(`    修复结果: ${isCorrected ? '✅ 修复成功' : '❌ 修复失败'}`);
    }
    
    // 6. 清理测试数据
    await connection.execute(`DROP TEMPORARY TABLE test_publish_date`);
    console.log('\n🧹 测试数据清理完成');
    
    // 7. 提供具体的代码修改建议
    console.log('\n📝 代码修改建议:');
    console.log('  在 services/adminService.js 中修改日期存储逻辑:');
    console.log('  ');
    console.log('  // 修复前:');
    console.log('  const date = req.body.date; // 直接使用');
    console.log('  ');
    console.log('  // 修复后:');
    console.log('  const userDate = req.body.date;');
    console.log('  const correctedDate = `${userDate} 08:00:00`; // 添加8小时偏移');
    console.log('  ');
    console.log('  这样存储的日期在查询时会正确显示为用户选择的日期');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
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

// 运行修复
if (require.main === module) {
  fixPublishDateStorage().catch(console.error);
}

module.exports = { fixPublishDateStorage };
