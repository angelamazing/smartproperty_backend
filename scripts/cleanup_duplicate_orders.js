const mysql = require('mysql2/promise');
const config = require('../config/database');

async function cleanupDuplicateOrders() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    
    console.log('🔍 清理重复的报餐记录...');
    
    // 查询9月11日午餐的所有记录
    const [orders] = await connection.execute(
      'SELECT _id, registrantName, memberIds, memberNames, createTime, status, deptId FROM dining_orders WHERE diningDate = ? AND mealType = ? ORDER BY createTime',
      ['2025-09-11', 'lunch']
    );
    
    console.log('\n📋 找到的午餐记录:');
    console.log('总记录数:', orders.length);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. 订单ID: ${order._id}`);
      console.log(`   报餐人: ${order.registrantName}`);
      console.log(`   成员ID: ${order.memberIds}`);
      console.log(`   成员姓名: ${order.memberNames}`);
      console.log(`   状态: ${order.status}`);
      console.log(`   创建时间: ${order.createTime}`);
    });
    
    // 分析重复情况
    console.log('\n🔍 分析重复情况...');
    const memberCounts = {};
    orders.forEach(order => {
      if (order.memberIds) {
        try {
          // 处理逗号分隔的字符串
          const memberIds = order.memberIds.split(',').map(id => id.trim()).filter(id => id);
          const key = memberIds.sort().join(',');
          if (!memberCounts[key]) {
            memberCounts[key] = [];
          }
          memberCounts[key].push(order);
        } catch (error) {
          console.log('解析memberIds失败:', order.memberIds);
        }
      }
    });
    
    // 找出重复的并删除
    let deletedCount = 0;
    Object.keys(memberCounts).forEach(key => {
      if (memberCounts[key].length > 1) {
        console.log(`\n❌ 发现重复报餐组合: ${key}`);
        console.log(`   重复记录数: ${memberCounts[key].length}`);
        
        // 按创建时间排序，保留最早的，删除其他的
        const sortedOrders = memberCounts[key].sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        const keepOrder = sortedOrders[0];
        const deleteOrders = sortedOrders.slice(1);
        
        console.log(`   ✅ 保留记录: ${keepOrder._id} (${keepOrder.createTime})`);
        
        deleteOrders.forEach(order => {
          console.log(`   ❌ 删除记录: ${order._id} (${order.createTime})`);
        });
        
        // 执行删除
        deleteOrders.forEach(async (order) => {
          try {
            await connection.execute('DELETE FROM dining_orders WHERE _id = ?', [order._id]);
            deletedCount++;
            console.log(`   ✅ 已删除: ${order._id}`);
          } catch (error) {
            console.log(`   ❌ 删除失败: ${order._id}, 错误: ${error.message}`);
          }
        });
      }
    });
    
    console.log(`\n🎉 清理完成！共删除 ${deletedCount} 条重复记录`);
    
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

cleanupDuplicateOrders();
