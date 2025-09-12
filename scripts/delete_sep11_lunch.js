const mysql = require('mysql2/promise');
const config = require('../config/database');

async function deleteSep11Lunch() {
  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: config.database.charset,
      timezone: config.database.timezone
    });

    console.log('🔍 查找9月11日午餐报餐记录...');
    
    // 查找9月11日午餐的报餐记录
    const [orders] = await connection.execute(`
      SELECT do._id, do.userId, do.registrantId, do.memberIds, do.diningDate, do.mealType, 
             do.status, do.diningStatus, do.createTime,
             u.nickName as registrantName
      FROM dining_orders do
      LEFT JOIN users u ON do.registrantId = u._id
      WHERE do.diningDate = '2025-09-11' 
        AND do.mealType = 'lunch'
        AND do.status != 'cancelled'
      ORDER BY do.createTime DESC
    `);

    if (orders.length === 0) {
      console.log('❌ 没有找到9月11日午餐的报餐记录');
      return;
    }

    console.log(`📋 找到 ${orders.length} 条9月11日午餐报餐记录:`);
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order._id}`);
      console.log(`   报餐人: ${order.registrantName} (${order.registrantId})`);
      console.log(`   成员: ${order.memberIds}`);
      console.log(`   状态: ${order.status} / ${order.diningStatus}`);
      console.log(`   创建时间: ${order.createTime}`);
      console.log('   ---');
    });

    // 查找系统管理员的记录
    const sysAdminOrders = orders.filter(order => {
      try {
        const memberIds = JSON.parse(order.memberIds);
        return memberIds.some(id => {
          // 这里需要根据实际的系统管理员ID来判断
          // 我们先显示所有记录，让用户确认
          return true;
        });
      } catch (error) {
        return false;
      }
    });

    console.log('\n🔍 查找系统管理员相关的记录...');
    
    // 查找系统管理员用户
    const [sysAdmins] = await connection.execute(`
      SELECT _id, nickName, role FROM users 
      WHERE role = 'sys_admin' AND status = 'active'
    `);

    console.log('👥 系统管理员用户:');
    sysAdmins.forEach(admin => {
      console.log(`   ${admin.nickName} (${admin._id})`);
    });

    // 查找包含系统管理员的报餐记录
    const sysAdminOrderIds = [];
    for (const order of orders) {
      try {
        let memberIds;
        // 尝试解析JSON格式
        try {
          memberIds = JSON.parse(order.memberIds);
        } catch (jsonError) {
          // 如果不是JSON，按逗号分隔
          memberIds = order.memberIds.split(',').map(id => id.trim()).filter(id => id);
        }
        
        const hasSysAdmin = memberIds.some(id => 
          sysAdmins.some(admin => admin._id === id)
        );
        
        if (hasSysAdmin) {
          sysAdminOrderIds.push(order._id);
          console.log(`\n🎯 找到包含系统管理员的记录: ${order._id}`);
          console.log(`   报餐人: ${order.registrantName}`);
          console.log(`   成员ID: ${order.memberIds}`);
          console.log(`   解析后的成员: ${memberIds.join(', ')}`);
        }
      } catch (error) {
        console.log(`⚠️ 解析成员ID失败: ${order._id} - ${order.memberIds}`);
      }
    }

    if (sysAdminOrderIds.length === 0) {
      console.log('❌ 没有找到包含系统管理员的9月11日午餐报餐记录');
      return;
    }

    console.log(`\n🗑️ 准备删除 ${sysAdminOrderIds.length} 条记录...`);
    
    // 开始事务
    await connection.beginTransaction();

    try {
      // 删除报餐记录
      for (const orderId of sysAdminOrderIds) {
        console.log(`删除报餐记录: ${orderId}`);
        await connection.execute(
          'DELETE FROM dining_orders WHERE _id = ?',
          [orderId]
        );
      }

      // 删除相关的确认就餐日志
      for (const orderId of sysAdminOrderIds) {
        console.log(`删除确认就餐日志: ${orderId}`);
        await connection.execute(
          'DELETE FROM dining_confirmation_logs WHERE orderId = ?',
          [orderId]
        );
      }

      // 删除相关的扫码登记记录
      for (const orderId of sysAdminOrderIds) {
        console.log(`删除扫码登记记录: ${orderId}`);
        await connection.execute(
          'DELETE FROM dining_registrations WHERE orderId = ?',
          [orderId]
        );
      }

      // 提交事务
      await connection.commit();
      
      console.log('\n✅ 删除成功！');
      console.log(`已删除 ${sysAdminOrderIds.length} 条9月11日午餐报餐记录`);
      console.log('现在您可以重新报餐来验证时间是否正确');

    } catch (error) {
      // 回滚事务
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

// 执行删除
deleteSep11Lunch().catch(console.error);
