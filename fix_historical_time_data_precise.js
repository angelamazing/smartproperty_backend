const mysql = require('mysql2/promise');
const moment = require('moment-timezone');

/**
 * 精确修复历史时间数据脚本
 * 基于前端分析，精确识别和修复错误存储的时间数据
 */
async function fixHistoricalTimeDataPrecise() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dining_system',
      timezone: '+00:00'
    });

    console.log('🔧 开始精确修复历史时间数据...');
    console.log('⚠️  请确保已备份数据库！');
    console.log('📋 基于前端分析：前端只发送日期字符串，后端错误存储本地时间为UTC');

    // 1. 修复报餐订单时间
    await fixDiningOrdersTimePrecise(connection);
    
    // 2. 修复确认就餐时间
    await fixDiningConfirmationsTimePrecise(connection);
    
    // 3. 修复扫码登记时间
    await fixDiningRegistrationsTimePrecise(connection);

    console.log('✅ 历史时间数据精确修复完成！');
  } catch (error) {
    console.error('❌ 修复历史时间数据失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 精确修复报餐订单时间
 * 识别错误存储的本地时间（作为UTC）并修正
 */
async function fixDiningOrdersTimePrecise(connection) {
  try {
    console.log('\n📋 精确修复报餐订单时间...');
    
    // 查找需要修复的订单
    // 条件：时间看起来像本地时间但存储为UTC的
    const [orders] = await connection.execute(`
      SELECT _id, registerTime, createTime, diningDate, mealType
      FROM dining_orders 
      WHERE registerTime IS NOT NULL 
      AND registerTime LIKE '%T0%:00.000Z'
      AND HOUR(registerTime) BETWEEN 6 AND 23
      AND registerTime NOT LIKE '%T00:%'
      AND registerTime NOT LIKE '%T01:%'
      AND registerTime NOT LIKE '%T02:%'
      AND registerTime NOT LIKE '%T03:%'
      AND registerTime NOT LIKE '%T04:%'
      AND registerTime NOT LIKE '%T05:%'
    `);

    console.log(`🔍 找到 ${orders.length} 个需要精确修复的报餐订单`);

    if (orders.length === 0) {
      console.log('✅ 没有需要修复的报餐订单');
      return;
    }

    let fixedCount = 0;
    for (const order of orders) {
      try {
        // 分析时间模式
        const wrongTime = new Date(order.registerTime);
        const hour = wrongTime.getUTCHours();
        
        // 如果UTC小时在6-23之间，说明这是错误的本地时间存储
        if (hour >= 6 && hour <= 23) {
          // 将错误的UTC时间减去8小时（北京时间比UTC快8小时）
          const correctTime = moment(wrongTime).subtract(8, 'hours').utc().toDate();
          
          await connection.execute(
            `UPDATE dining_orders 
             SET registerTime = ?, createTime = ?
             WHERE _id = ?`,
            [correctTime.toISOString(), correctTime.toISOString(), order._id]
          );
          
          console.log(`✅ 修复订单 ${order._id}: ${order.registerTime} -> ${correctTime.toISOString()}`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ 修复订单 ${order._id} 失败:`, error.message);
      }
    }

    console.log(`📊 报餐订单精确修复完成: ${fixedCount}/${orders.length}`);
  } catch (error) {
    console.error('❌ 修复报餐订单时间失败:', error);
  }
}

/**
 * 精确修复确认就餐时间
 */
async function fixDiningConfirmationsTimePrecise(connection) {
  try {
    console.log('\n🍽️ 精确修复确认就餐时间...');
    
    const [confirmations] = await connection.execute(`
      SELECT _id, actualDiningTime, diningDate, mealType
      FROM dining_orders 
      WHERE actualDiningTime IS NOT NULL 
      AND actualDiningTime LIKE '%T0%:00.000Z'
      AND HOUR(actualDiningTime) BETWEEN 6 AND 23
      AND actualDiningTime NOT LIKE '%T00:%'
      AND actualDiningTime NOT LIKE '%T01:%'
      AND actualDiningTime NOT LIKE '%T02:%'
      AND actualDiningTime NOT LIKE '%T03:%'
      AND actualDiningTime NOT LIKE '%T04:%'
      AND actualDiningTime NOT LIKE '%T05:%'
    `);

    console.log(`🔍 找到 ${confirmations.length} 个需要精确修复的确认就餐记录`);

    if (confirmations.length === 0) {
      console.log('✅ 没有需要修复的确认就餐记录');
      return;
    }

    let fixedCount = 0;
    for (const confirmation of confirmations) {
      try {
        const wrongTime = new Date(confirmation.actualDiningTime);
        const hour = wrongTime.getUTCHours();
        
        if (hour >= 6 && hour <= 23) {
          const correctTime = moment(wrongTime).subtract(8, 'hours').utc().toDate();
          
          await connection.execute(
            `UPDATE dining_orders 
             SET actualDiningTime = ?
             WHERE _id = ?`,
            [correctTime.toISOString(), confirmation._id]
          );
          
          console.log(`✅ 修复确认就餐 ${confirmation._id}: ${confirmation.actualDiningTime} -> ${correctTime.toISOString()}`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ 修复确认就餐 ${confirmation._id} 失败:`, error.message);
      }
    }

    console.log(`📊 确认就餐精确修复完成: ${fixedCount}/${confirmations.length}`);
  } catch (error) {
    console.error('❌ 修复确认就餐时间失败:', error);
  }
}

/**
 * 精确修复扫码登记时间
 */
async function fixDiningRegistrationsTimePrecise(connection) {
  try {
    console.log('\n📱 精确修复扫码登记时间...');
    
    const [registrations] = await connection.execute(`
      SELECT _id, scanTime, diningDate, mealType
      FROM dining_registrations 
      WHERE scanTime IS NOT NULL 
      AND scanTime LIKE '%T0%:00.000Z'
      AND HOUR(scanTime) BETWEEN 6 AND 23
      AND scanTime NOT LIKE '%T00:%'
      AND scanTime NOT LIKE '%T01:%'
      AND scanTime NOT LIKE '%T02:%'
      AND scanTime NOT LIKE '%T03:%'
      AND scanTime NOT LIKE '%T04:%'
      AND scanTime NOT LIKE '%T05:%'
    `);

    console.log(`🔍 找到 ${registrations.length} 个需要精确修复的扫码登记记录`);

    if (registrations.length === 0) {
      console.log('✅ 没有需要修复的扫码登记记录');
      return;
    }

    let fixedCount = 0;
    for (const registration of registrations) {
      try {
        const wrongTime = new Date(registration.scanTime);
        const hour = wrongTime.getUTCHours();
        
        if (hour >= 6 && hour <= 23) {
          const correctTime = moment(wrongTime).subtract(8, 'hours').utc().toDate();
          
          await connection.execute(
            `UPDATE dining_registrations 
             SET scanTime = ?
             WHERE _id = ?`,
            [correctTime.toISOString(), registration._id]
          );
          
          console.log(`✅ 修复扫码登记 ${registration._id}: ${registration.scanTime} -> ${correctTime.toISOString()}`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ 修复扫码登记 ${registration._id} 失败:`, error.message);
      }
    }

    console.log(`📊 扫码登记精确修复完成: ${fixedCount}/${registrations.length}`);
  } catch (error) {
    console.error('❌ 修复扫码登记时间失败:', error);
  }
}

/**
 * 验证修复结果
 */
async function verifyFixResultsPrecise(connection) {
  try {
    console.log('\n🔍 验证精确修复结果...');
    
    // 检查报餐订单
    const [orders] = await connection.execute(`
      SELECT COUNT(*) as count FROM dining_orders 
      WHERE registerTime IS NOT NULL 
      AND registerTime LIKE '%T0%:00.000Z'
      AND HOUR(registerTime) BETWEEN 6 AND 23
    `);
    
    console.log(`📋 剩余需要修复的报餐订单: ${orders[0].count}`);
    
    // 检查确认就餐
    const [confirmations] = await connection.execute(`
      SELECT COUNT(*) as count FROM dining_orders 
      WHERE actualDiningTime IS NOT NULL 
      AND actualDiningTime LIKE '%T0%:00.000Z'
      AND HOUR(actualDiningTime) BETWEEN 6 AND 23
    `);
    
    console.log(`🍽️ 剩余需要修复的确认就餐记录: ${confirmations[0].count}`);
    
    // 检查扫码登记
    const [registrations] = await connection.execute(`
      SELECT COUNT(*) as count FROM dining_registrations 
      WHERE scanTime IS NOT NULL 
      AND scanTime LIKE '%T0%:00.000Z'
      AND HOUR(scanTime) BETWEEN 6 AND 23
    `);
    
    console.log(`📱 剩余需要修复的扫码登记记录: ${registrations[0].count}`);
    
    const totalRemaining = orders[0].count + confirmations[0].count + registrations[0].count;
    if (totalRemaining === 0) {
      console.log('🎉 所有时间数据精确修复完成！');
    } else {
      console.log(`⚠️  还有 ${totalRemaining} 条记录需要修复`);
    }
  } catch (error) {
    console.error('❌ 验证修复结果失败:', error);
  }
}

/**
 * 显示修复统计信息
 */
async function showFixStatisticsPrecise(connection) {
  try {
    console.log('\n📊 精确修复统计信息:');
    
    // 报餐订单统计
    const [orderStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN registerTime IS NOT NULL THEN 1 END) as withRegisterTime,
        COUNT(CASE WHEN actualDiningTime IS NOT NULL THEN 1 END) as withActualDiningTime
      FROM dining_orders
    `);
    
    console.log(`📋 报餐订单总数: ${orderStats[0].total}`);
    console.log(`   - 有报餐时间: ${orderStats[0].withRegisterTime}`);
    console.log(`   - 有确认就餐时间: ${orderStats[0].withActualDiningTime}`);
    
    // 扫码登记统计
    const [registrationStats] = await connection.execute(`
      SELECT COUNT(*) as total FROM dining_registrations
    `);
    
    console.log(`📱 扫码登记总数: ${registrationStats[0].total}`);
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error);
  }
}

// 主函数
async function main() {
  console.log('🔧 报餐系统时间数据精确修复工具');
  console.log('=====================================');
  console.log('📋 基于前端分析：');
  console.log('   - 前端只发送日期字符串（如 "2025-09-11"）');
  console.log('   - 后端使用服务器当前时间作为 registerTime');
  console.log('   - 后端错误地将本地时间存储为UTC时间');
  console.log('   - 导致时间相差8小时');
  console.log('');
  
  // 检查环境变量
  if (!process.env.DB_HOST && !process.env.DB_USER) {
    console.log('⚠️  请设置数据库连接环境变量:');
    console.log('   DB_HOST=localhost');
    console.log('   DB_USER=root');
    console.log('   DB_PASSWORD=your_password');
    console.log('   DB_NAME=dining_system');
    console.log('');
  }
  
  try {
    await fixHistoricalTimeDataPrecise();
    await showFixStatisticsPrecise();
  } catch (error) {
    console.error('❌ 修复过程出现错误:', error);
    process.exit(1);
  }
}

// 运行精确修复脚本
if (require.main === module) {
  main();
}

module.exports = { 
  fixHistoricalTimeDataPrecise,
  fixDiningOrdersTimePrecise,
  fixDiningConfirmationsTimePrecise,
  fixDiningRegistrationsTimePrecise,
  verifyFixResultsPrecise,
  showFixStatisticsPrecise
};
