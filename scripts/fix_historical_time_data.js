const mysql = require('mysql2/promise');
const moment = require('moment-timezone');

/**
 * 修复历史时间数据脚本
 * 用于修复报餐系统中错误存储的时间数据
 */
async function fixHistoricalTimeData() {
  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dining_system',
      timezone: '+00:00' // 确保使用UTC时区
    });

    console.log('🚀 开始修复历史时间数据...');
    console.log('⚠️  请确保已备份数据库！');

    // 1. 修复报餐订单时间
    await fixDiningOrdersTime(connection);
    
    // 2. 修复确认就餐时间
    await fixDiningConfirmationsTime(connection);
    
    // 3. 修复扫码登记时间
    await fixDiningRegistrationsTime(connection);

    console.log('✅ 历史时间数据修复完成！');
  } catch (error) {
    console.error('❌ 修复历史时间数据失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 修复报餐订单时间
 * 将错误存储的本地时间（作为UTC）转换为正确的UTC时间
 */
async function fixDiningOrdersTime(connection) {
  try {
    console.log('\n📋 修复报餐订单时间...');
    
    // 查找需要修复的订单（时间看起来像本地时间但存储为UTC的）
    const [orders] = await connection.execute(`
      SELECT _id, registerTime, createTime, actualDiningTime, diningDate, mealType
      FROM dining_orders 
      WHERE registerTime IS NOT NULL 
      AND registerTime LIKE '%T0%:00.000Z'
      AND HOUR(registerTime) BETWEEN 6 AND 23
    `);

    console.log(`🔍 找到 ${orders.length} 个需要修复的报餐订单`);

    if (orders.length === 0) {
      console.log('✅ 没有需要修复的报餐订单');
      return;
    }

    let fixedCount = 0;
    for (const order of orders) {
      try {
        // 将错误的UTC时间加上8小时（北京时间比UTC快8小时）
        const wrongTime = new Date(order.registerTime);
        const correctTime = new Date(wrongTime.getTime() + (8 * 60 * 60 * 1000));
        
        await connection.execute(
          `UPDATE dining_orders 
           SET registerTime = ?, createTime = ?
           WHERE _id = ?`,
          [correctTime.toISOString(), correctTime.toISOString(), order._id]
        );
        
        console.log(`✅ 修复订单 ${order._id}: ${order.registerTime} -> ${correctTime.toISOString()}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复订单 ${order._id} 失败:`, error.message);
      }
    }

    console.log(`📊 报餐订单修复完成: ${fixedCount}/${orders.length}`);
  } catch (error) {
    console.error('❌ 修复报餐订单时间失败:', error);
  }
}

/**
 * 修复确认就餐时间
 * 将错误存储的本地时间（作为UTC）转换为正确的UTC时间
 */
async function fixDiningConfirmationsTime(connection) {
  try {
    console.log('\n🍽️ 修复确认就餐时间...');
    
    const [confirmations] = await connection.execute(`
      SELECT _id, actualDiningTime, diningDate, mealType
      FROM dining_orders 
      WHERE actualDiningTime IS NOT NULL 
      AND actualDiningTime LIKE '%T0%:00.000Z'
      AND HOUR(actualDiningTime) BETWEEN 6 AND 23
    `);

    console.log(`🔍 找到 ${confirmations.length} 个需要修复的确认就餐记录`);

    if (confirmations.length === 0) {
      console.log('✅ 没有需要修复的确认就餐记录');
      return;
    }

    let fixedCount = 0;
    for (const confirmation of confirmations) {
      try {
        const wrongTime = new Date(confirmation.actualDiningTime);
        const correctTime = new Date(wrongTime.getTime() + (8 * 60 * 60 * 1000));
        
        await connection.execute(
          `UPDATE dining_orders 
           SET actualDiningTime = ?
           WHERE _id = ?`,
          [correctTime.toISOString(), confirmation._id]
        );
        
        console.log(`✅ 修复确认就餐 ${confirmation._id}: ${confirmation.actualDiningTime} -> ${correctTime.toISOString()}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复确认就餐 ${confirmation._id} 失败:`, error.message);
      }
    }

    console.log(`📊 确认就餐修复完成: ${fixedCount}/${confirmations.length}`);
  } catch (error) {
    console.error('❌ 修复确认就餐时间失败:', error);
  }
}

/**
 * 修复扫码登记时间
 * 将错误存储的本地时间（作为UTC）转换为正确的UTC时间
 */
async function fixDiningRegistrationsTime(connection) {
  try {
    console.log('\n📱 修复扫码登记时间...');
    
    const [registrations] = await connection.execute(`
      SELECT _id, scanTime, diningDate, mealType
      FROM dining_registrations 
      WHERE scanTime IS NOT NULL 
      AND scanTime LIKE '%T0%:00.000Z'
      AND HOUR(scanTime) BETWEEN 6 AND 23
    `);

    console.log(`🔍 找到 ${registrations.length} 个需要修复的扫码登记记录`);

    if (registrations.length === 0) {
      console.log('✅ 没有需要修复的扫码登记记录');
      return;
    }

    let fixedCount = 0;
    for (const registration of registrations) {
      try {
        const wrongTime = new Date(registration.scanTime);
        const correctTime = new Date(wrongTime.getTime() + (8 * 60 * 60 * 1000));
        
        await connection.execute(
          `UPDATE dining_registrations 
           SET scanTime = ?
           WHERE _id = ?`,
          [correctTime.toISOString(), registration._id]
        );
        
        console.log(`✅ 修复扫码登记 ${registration._id}: ${registration.scanTime} -> ${correctTime.toISOString()}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复扫码登记 ${registration._id} 失败:`, error.message);
      }
    }

    console.log(`📊 扫码登记修复完成: ${fixedCount}/${registrations.length}`);
  } catch (error) {
    console.error('❌ 修复扫码登记时间失败:', error);
  }
}

/**
 * 验证修复结果
 * 检查修复后的时间是否正确
 */
async function verifyFixResults(connection) {
  try {
    console.log('\n🔍 验证修复结果...');
    
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
      console.log('🎉 所有时间数据修复完成！');
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
async function showFixStatistics(connection) {
  try {
    console.log('\n📊 修复统计信息:');
    
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
  console.log('🔧 报餐系统时间数据修复工具');
  console.log('=====================================');
  
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
    await fixHistoricalTimeData();
    await showFixStatistics();
  } catch (error) {
    console.error('❌ 修复过程出现错误:', error);
    process.exit(1);
  }
}

// 运行修复脚本
if (require.main === module) {
  main();
}

module.exports = { 
  fixHistoricalTimeData,
  fixDiningOrdersTime,
  fixDiningConfirmationsTime,
  fixDiningRegistrationsTime,
  verifyFixResults,
  showFixStatistics
};
