const mysql = require('mysql2/promise');
const config = require('../config/database');

async function deleteDinnerDuplicates() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    
    console.log('🔍 删除晚餐重复记录...');
    
    // 查询所有9月11日晚餐记录
    const [orders] = await connection.execute(
      'SELECT _id, createTime FROM dining_orders WHERE diningDate = ? AND mealType = ? ORDER BY createTime',
      ['2025-09-11', 'dinner']
    );
    
    console.log(`找到 ${orders.length} 条晚餐记录`);
    
    if (orders.length > 1) {
      // 保留最早的记录，删除其他所有记录
      const keepOrder = orders[0];
      const deleteOrders = orders.slice(1);
      
      console.log(`保留记录: ${keepOrder._id} (${keepOrder.createTime})`);
      
      for (const order of deleteOrders) {
        console.log(`删除记录: ${order._id} (${order.createTime})`);
        await connection.execute('DELETE FROM dining_orders WHERE _id = ?', [order._id]);
        console.log(`✅ 已删除: ${order._id}`);
      }
      
      console.log(`\n🎉 晚餐清理完成！删除了 ${deleteOrders.length} 条重复记录`);
    } else {
      console.log('没有重复的晚餐记录需要删除');
    }
    
    // 验证删除结果
    const [remaining] = await connection.execute(
      'SELECT COUNT(*) as count FROM dining_orders WHERE diningDate = ? AND mealType = ?',
      ['2025-09-11', 'dinner']
    );
    
    console.log(`\n📊 剩余晚餐记录数: ${remaining[0].count}`);
    
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

deleteDinnerDuplicates();
