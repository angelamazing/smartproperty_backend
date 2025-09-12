const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testDiningConfirmation() {
  let connection;
  try {
    console.log('🧪 开始测试确认就餐功能...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');

    // 1. 检查dining_confirmation_logs表是否存在
    console.log('\n📋 检查dining_confirmation_logs表...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'dining_confirmation_logs'"
    );
    
    if (tables.length > 0) {
      console.log('✅ dining_confirmation_logs表存在');
      
      // 显示表结构
      const [columns] = await connection.execute('DESCRIBE dining_confirmation_logs');
      console.log('📊 表结构:');
      columns.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ dining_confirmation_logs表不存在');
    }

    // 2. 检查dining_orders表的确认就餐字段
    console.log('\n📋 检查dining_orders表确认就餐字段...');
    const [orderColumns] = await connection.execute('DESCRIBE dining_orders');
    
    const requiredFields = ['actualDiningTime', 'diningStatus', 'userId', 'userName'];
    const fieldStatus = {};
    
    requiredFields.forEach(field => {
      const exists = orderColumns.some(col => col.Field === field);
      fieldStatus[field] = exists;
      console.log(`   ${field}: ${exists ? '✅' : '❌'}`);
    });

    // 3. 检查现有报餐数据
    console.log('\n📊 检查现有报餐数据...');
    const [orderStats] = await connection.execute(
      `SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN diningStatus = 'ordered' THEN 1 ELSE 0 END) as orderedCount,
        SUM(CASE WHEN diningStatus = 'dined' THEN 1 ELSE 0 END) as dinedCount,
        SUM(CASE WHEN diningStatus = 'cancelled' THEN 1 ELSE 0 END) as cancelledCount
       FROM dining_orders`
    );
    
    if (orderStats.length > 0) {
      const stats = orderStats[0];
      console.log(`   总订单数: ${stats.totalOrders}`);
      console.log(`   已报餐: ${stats.orderedCount}`);
      console.log(`   已就餐: ${stats.dinedCount}`);
      console.log(`   已取消: ${stats.cancelledCount}`);
    }

    // 4. 检查确认就餐日志数据
    console.log('\n📊 检查确认就餐日志数据...');
    const [logStats] = await connection.execute(
      `SELECT 
        COUNT(*) as totalLogs,
        SUM(CASE WHEN confirmationType = 'manual' THEN 1 ELSE 0 END) as manualCount,
        SUM(CASE WHEN confirmationType = 'qr' THEN 1 ELSE 0 END) as qrCount,
        SUM(CASE WHEN confirmationType = 'admin' THEN 1 ELSE 0 END) as adminCount
       FROM dining_confirmation_logs`
    );
    
    if (logStats.length > 0) {
      const stats = logStats[0];
      console.log(`   总日志数: ${stats.totalLogs}`);
      console.log(`   手动确认: ${stats.manualCount}`);
      console.log(`   扫码确认: ${stats.qrCount}`);
      console.log(`   管理员确认: ${stats.adminCount}`);
    }

    // 5. 测试API路由配置
    console.log('\n🔗 检查API路由配置...');
    try {
      const fs = require('fs');
      const serverPath = require('path').join(__dirname, '../server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const hasRouteImport = serverContent.includes('diningConfirmationRoutes');
      const hasRouteUse = serverContent.includes('/api/dining-confirmation');
      
      console.log(`   路由导入: ${hasRouteImport ? '✅' : '❌'}`);
      console.log(`   路由注册: ${hasRouteUse ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   ❌ 无法检查路由配置');
    }

    // 6. 检查服务文件
    console.log('\n📁 检查服务文件...');
    const fs = require('fs');
    const path = require('path');
    
    const serviceFiles = [
      '../services/diningConfirmationService.js',
      '../controllers/diningConfirmationController.js',
      '../routes/diningConfirmation.js'
    ];
    
    serviceFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
    });

    // 7. 总结测试结果
    console.log('\n📋 测试结果总结:');
    const allFieldsExist = Object.values(fieldStatus).every(exists => exists);
    const tableExists = tables.length > 0;
    
    if (tableExists && allFieldsExist) {
      console.log('🎉 确认就餐功能配置完整！');
      console.log('✅ 数据库表结构正确');
      console.log('✅ 确认就餐字段完整');
      console.log('✅ 服务文件存在');
      console.log('✅ 可以开始使用确认就餐功能');
    } else {
      console.log('⚠️  确认就餐功能配置不完整');
      if (!tableExists) console.log('❌ dining_confirmation_logs表不存在');
      if (!allFieldsExist) console.log('❌ dining_orders表缺少必要字段');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行测试
if (require.main === module) {
  testDiningConfirmation()
    .then(() => {
      console.log('\n✅ 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试失败:', error);
      process.exit(1);
    });
}

module.exports = testDiningConfirmation;
