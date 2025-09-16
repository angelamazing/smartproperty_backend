const mysql = require('mysql2/promise');
const moment = require('moment-timezone');

/**
 * 一键修复时间问题脚本
 * 快速诊断和修复时间显示问题
 */
async function quickFixTimeIssue() {
  let connection;
  try {
    console.log('🚀 开始一键修复时间问题...');
    console.log('=====================================');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dining_system',
      timezone: '+00:00'
    });

    // 1. 检查当前数据状态
    console.log('\n📋 检查当前数据状态...');
    const [currentData] = await connection.execute(`
      SELECT 
        _id,
        registerTime,
        actualDiningTime,
        DATE_FORMAT(CONVERT_TZ(registerTime, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') as beijing_register_time,
        DATE_FORMAT(CONVERT_TZ(actualDiningTime, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') as beijing_dining_time,
        createTime
      FROM dining_orders 
      WHERE registerTime IS NOT NULL
      ORDER BY createTime DESC 
      LIMIT 5
    `);
    
    console.log('当前数据状态:');
    currentData.forEach(row => {
      console.log(`ID: ${row._id}`);
      console.log(`  UTC存储: ${row.registerTime}`);
      console.log(`  北京时间: ${row.beijing_register_time}`);
      if (row.actualDiningTime) {
        console.log(`  确认就餐UTC: ${row.actualDiningTime}`);
        console.log(`  确认就餐北京时间: ${row.beijing_dining_time}`);
      }
      console.log('');
    });
    
    // 2. 分析问题类型
    console.log('\n🔍 分析问题类型...');
    const [problemAnalysis] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN HOUR(registerTime) BETWEEN 6 AND 23 THEN 1 END) as wrong_utc_records,
        COUNT(CASE WHEN HOUR(registerTime) BETWEEN 0 AND 5 THEN 1 END) as correct_utc_records
      FROM dining_orders 
      WHERE registerTime IS NOT NULL
    `);
    
    const analysis = problemAnalysis[0];
    console.log(`总记录数: ${analysis.total_records}`);
    console.log(`可能错误的记录数: ${analysis.wrong_utc_records}`);
    console.log(`可能正确的记录数: ${analysis.correct_utc_records}`);
    
    if (analysis.wrong_utc_records > 0) {
      console.log('❌ 发现问题：存在错误存储的UTC时间记录');
      
      // 3. 修复历史数据
      console.log('\n🔧 开始修复历史数据...');
      const [needFix] = await connection.execute(`
        SELECT _id, registerTime, actualDiningTime
        FROM dining_orders 
        WHERE registerTime IS NOT NULL 
        AND registerTime LIKE '%T0%:00.000Z'
        AND HOUR(registerTime) BETWEEN 6 AND 23
      `);
      
      console.log(`找到 ${needFix.length} 条需要修复的记录`);
      
      let fixedCount = 0;
      for (const record of needFix) {
        try {
          // 修复报餐时间
          const wrongRegisterTime = new Date(record.registerTime);
          const correctRegisterTime = moment(wrongRegisterTime).subtract(8, 'hours').utc().toDate();
          
          let updateQuery = `UPDATE dining_orders SET registerTime = ?`;
          let updateParams = [correctRegisterTime.toISOString()];
          
          // 如果有确认就餐时间，也一起修复
          if (record.actualDiningTime) {
            const wrongDiningTime = new Date(record.actualDiningTime);
            const correctDiningTime = moment(wrongDiningTime).subtract(8, 'hours').utc().toDate();
            updateQuery += `, actualDiningTime = ?`;
            updateParams.push(correctDiningTime.toISOString());
          }
          
          updateQuery += ` WHERE _id = ?`;
          updateParams.push(record._id);
          
          await connection.execute(updateQuery, updateParams);
          
          fixedCount++;
          console.log(`✅ 修复记录 ${record._id}`);
        } catch (error) {
          console.error(`❌ 修复记录 ${record._id} 失败:`, error.message);
        }
      }
      
      console.log(`📊 修复完成: ${fixedCount} 条记录`);
      
      // 4. 验证修复结果
      console.log('\n✅ 验证修复结果...');
      const [fixedData] = await connection.execute(`
        SELECT 
          _id,
          registerTime,
          actualDiningTime,
          DATE_FORMAT(CONVERT_TZ(registerTime, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') as beijing_register_time,
          DATE_FORMAT(CONVERT_TZ(actualDiningTime, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') as beijing_dining_time
        FROM dining_orders 
        WHERE registerTime IS NOT NULL
        ORDER BY createTime DESC 
        LIMIT 5
      `);
      
      console.log('修复后数据状态:');
      fixedData.forEach(row => {
        console.log(`ID: ${row._id}`);
        console.log(`  UTC存储: ${row.registerTime}`);
        console.log(`  北京时间: ${row.beijing_register_time}`);
        if (row.actualDiningTime) {
          console.log(`  确认就餐UTC: ${row.actualDiningTime}`);
          console.log(`  确认就餐北京时间: ${row.beijing_dining_time}`);
        }
        console.log('');
      });
      
    } else {
      console.log('✅ 数据存储看起来是正确的');
    }
    
    // 5. 检查扫码登记数据
    console.log('\n📱 检查扫码登记数据...');
    const [scanData] = await connection.execute(`
      SELECT 
        _id,
        scanTime,
        DATE_FORMAT(CONVERT_TZ(scanTime, '+00:00', '+08:00'), '%Y-%m-%d %H:%i:%s') as beijing_scan_time
      FROM dining_registrations 
      WHERE scanTime IS NOT NULL
      ORDER BY scanTime DESC 
      LIMIT 3
    `);
    
    if (scanData.length > 0) {
      console.log('扫码登记数据:');
      scanData.forEach(row => {
        console.log(`ID: ${row._id}, UTC: ${row.scanTime}, 北京时间: ${row.beijing_scan_time}`);
      });
    } else {
      console.log('暂无扫码登记数据');
    }
    
    // 6. 提供修复建议
    console.log('\n💡 修复建议:');
    console.log('=====================================');
    
    if (analysis.wrong_utc_records > 0) {
      console.log('✅ 历史数据已修复');
    }
    
    console.log('📋 请检查以下项目:');
    console.log('1. 确保后端代码已部署并重启');
    console.log('2. 确保前端使用时区转换显示时间');
    console.log('3. 测试新的报餐请求');
    console.log('4. 验证时间显示是否正确');
    
    console.log('\n🎉 一键修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 测试时间转换
 */
function testTimeConversion() {
  console.log('\n🧪 测试时间转换...');
  console.log('=====================================');
  
  // 测试用例
  const testCases = [
    '2025-09-11T17:18:00.000Z', // 错误的UTC时间
    '2025-09-11T09:18:00.000Z', // 正确的UTC时间
    '2025-09-11 17:18:00'       // 北京时间
  ];
  
  testCases.forEach((testTime, index) => {
    console.log(`\n测试用例 ${index + 1}: ${testTime}`);
    
    try {
      const utcTime = moment(testTime);
      const beijingTime = utcTime.tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
      console.log(`转换为北京时间: ${beijingTime}`);
      
      // 如果是错误的UTC时间，显示修复建议
      if (testTime.includes('T17:18:00.000Z')) {
        const correctUTC = moment(testTime).subtract(8, 'hours').utc().toISOString();
        const correctBeijing = moment(correctUTC).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
        console.log(`修复后UTC: ${correctUTC}`);
        console.log(`修复后北京时间: ${correctBeijing}`);
      }
    } catch (error) {
      console.error(`转换失败: ${error.message}`);
    }
  });
}

// 主函数
async function main() {
  console.log('🔧 报餐系统时间问题一键修复工具');
  console.log('=====================================');
  console.log('📋 功能:');
  console.log('   1. 检查当前数据状态');
  console.log('   2. 分析问题类型');
  console.log('   3. 修复历史数据');
  console.log('   4. 验证修复结果');
  console.log('   5. 提供修复建议');
  console.log('');
  
  // 检查环境变量
  if (!process.env.DB_HOST && !process.env.DB_USER) {
    console.log('⚠️  请设置数据库连接环境变量:');
    console.log('   export DB_HOST=localhost');
    console.log('   export DB_USER=root');
    console.log('   export DB_PASSWORD=your_password');
    console.log('   export DB_NAME=dining_system');
    console.log('');
  }
  
  try {
    await quickFixTimeIssue();
    testTimeConversion();
    
    console.log('\n🎉 所有检查和修复完成！');
  } catch (error) {
    console.error('❌ 修复过程出现错误:', error);
  }
}

// 运行一键修复
if (require.main === module) {
  main();
}

module.exports = { 
  quickFixTimeIssue,
  testTimeConversion
};
