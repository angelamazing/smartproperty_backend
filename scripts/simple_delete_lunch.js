const mysql = require('mysql2/promise');
const config = require('./config/database');

async function deleteSysAdminLunch() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: config.database.charset,
      timezone: config.database.timezone
    });

    console.log('🔍 查找系统管理员测试的9月11日午餐记录...');
    
    // 直接查找系统管理员测试的午餐记录
    const [orders] = await connection.execute(`
      SELECT do._id, do.userId, do.registrantId, do.memberIds, do.diningDate, do.mealType, 
             do.status, do.diningStatus, do.createTime,
             u.nickName as registrantName
      FROM dining_orders do
      LEFT JOIN users u ON do.registrantId = u._id
      WHERE do.diningDate = '2025-09-11' 
        AND do.mealType = 'lunch'
        AND do.registrantId = 'e87abd4e-f5ad-4012-926c-bb616b260c6b'
        AND do.status != 'cancelled'
    `);

    if (orders.length === 0) {
      console.log('❌ 没有找到系统管理员测试的9月11日午餐记录');
      return;
    }

    console.log(`📋 找到 ${orders.length} 条记录:`);
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order._id}`);
      console.log(`   报餐人: ${order.registrantName}`);
      console.log(`   成员: ${order.memberIds}`);
      console.log(`   状态: ${order.status} / ${order.diningStatus}`);
      console.log(`   创建时间: ${order.createTime}`);
    });

    console.log('\n🗑️ 开始删除...');
    
    await connection.beginTransaction();

    try {
      for (const order of orders) {
        console.log(`删除报餐记录: ${order._id}`);
        
        // 删除报餐记录
        await connection.execute(
          'DELETE FROM dining_orders WHERE _id = ?',
          [order._id]
        );
        
        // 删除确认就餐日志
        await connection.execute(
          'DELETE FROM dining_confirmation_logs WHERE orderId = ?',
          [order._id]
        );
        
        // 删除扫码登记记录
        await connection.execute(
          'DELETE FROM dining_registrations WHERE orderId = ?',
          [order._id]
        );
      }

      await connection.commit();
      
      console.log('\n✅ 删除成功！');
      console.log(`已删除系统管理员测试的 ${orders.length} 条9月11日午餐报餐记录`);
      console.log('现在您可以重新报餐来验证时间是否正确');

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    if (connection) {
      await connection.rollback();
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

deleteSysAdminLunch().catch(console.error);
