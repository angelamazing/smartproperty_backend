const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkDinnerDuplicates() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    
    console.log('🔍 检查晚餐重复记录...');
    
    // 查询9月11日晚餐的所有记录
    const [orders] = await connection.execute(
      'SELECT _id, registrantName, memberIds, memberNames, createTime, status, deptId FROM dining_orders WHERE diningDate = ? AND mealType = ? ORDER BY createTime',
      ['2025-09-11', 'dinner']
    );
    
    console.log('\n📋 找到的晚餐记录:');
    console.log('总记录数:', orders.length);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. 订单ID: ${order._id}`);
      console.log(`   报餐人: ${order.registrantName}`);
      console.log(`   部门ID: ${order.deptId}`);
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
    
    // 找出重复的
    Object.keys(memberCounts).forEach(key => {
      if (memberCounts[key].length > 1) {
        console.log(`\n❌ 发现重复报餐组合: ${key}`);
        console.log(`   重复记录数: ${memberCounts[key].length}`);
        
        memberCounts[key].forEach((order, index) => {
          console.log(`   ${index + 1}. 订单ID: ${order._id}, 报餐人: ${order.registrantName}, 时间: ${order.createTime}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkDinnerDuplicates();
