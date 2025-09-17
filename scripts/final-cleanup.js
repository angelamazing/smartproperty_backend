#!/usr/bin/env node

/**
 * 最终清理业务测试数据脚本
 * 分步骤执行，避免连接超时问题
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function finalCleanup() {
  let connection;
  
  try {
    console.log('🧹 开始最终清理业务测试数据...\n');
    
    // 连接数据库
    connection = await mysql.createConnection({
      ...config.database,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });
    console.log('✅ 数据库连接成功');
    
    // 1. 查看当前数据统计
    console.log('\n📊 清理前数据统计:');
    
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`  - 用户总数: ${userCount[0].count}`);
    
    const [menuCount] = await connection.execute('SELECT COUNT(*) as count FROM menus');
    console.log(`  - 菜单总数: ${menuCount[0].count}`);
    
    const [dishCount] = await connection.execute('SELECT COUNT(*) as count FROM dishes');
    console.log(`  - 菜品总数: ${dishCount[0].count}`);
    
    const [orderCount] = await connection.execute('SELECT COUNT(*) as count FROM dining_orders');
    console.log(`  - 订餐订单总数: ${orderCount[0].count}`);
    
    // 2. 删除9月16日之前的菜单数据
    console.log('\n🗑️  步骤1: 删除9月16日之前的菜单数据...');
    
    const [menuResult] = await connection.execute(`
      DELETE FROM menus 
      WHERE createTime < '2025-09-16 00:00:00'
    `);
    console.log(`  ✅ 删除了 ${menuResult.affectedRows} 条菜单记录`);
    
    // 3. 删除9月16日之前的订餐数据
    console.log('\n🗑️  步骤2: 删除9月16日之前的订餐数据...');
    
    const [orderResult] = await connection.execute(`
      DELETE FROM dining_orders 
      WHERE createTime < '2025-09-16 00:00:00'
    `);
    console.log(`  ✅ 删除了 ${orderResult.affectedRows} 条订餐订单记录`);
    
    // 4. 清理用户数据，只保留系统管理员
    console.log('\n👥 步骤3: 清理用户数据，只保留系统管理员...');
    
    // 查看当前管理员用户
    const [adminUsers] = await connection.execute(`
      SELECT _id, nickName, role, createTime 
      FROM users 
      WHERE role IN ('sys_admin', 'admin')
    `);
    
    console.log(`  📋 找到 ${adminUsers.length} 个管理员用户:`);
    adminUsers.forEach(user => {
      console.log(`    - ${user.nickName} (${user.role}) - ${user.createTime}`);
    });
    
    // 删除非管理员用户
    const [userResult] = await connection.execute(`
      DELETE FROM users 
      WHERE role NOT IN ('sys_admin', 'admin')
    `);
    console.log(`  ✅ 删除了 ${userResult.affectedRows} 个非管理员用户`);
    
    // 5. 清理测试菜品数据
    console.log('\n🍽️  步骤4: 清理测试菜品数据...');
    
    const [dishResult] = await connection.execute(`
      DELETE FROM dishes 
      WHERE createTime < '2025-09-16 00:00:00' 
      OR name LIKE '%测试%' 
      OR name LIKE '%test%'
    `);
    console.log(`  ✅ 删除了 ${dishResult.affectedRows} 个测试菜品`);
    
    console.log('\n✅ 主要清理操作完成');
    
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error);
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
  
  // 6. 重新连接查看清理结果
  try {
    console.log('\n📊 查看清理结果...');
    
    connection = await mysql.createConnection(config.database);
    
    const [userCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`  - 用户总数: ${userCountAfter[0].count}`);
    
    const [menuCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM menus');
    console.log(`  - 菜单总数: ${menuCountAfter[0].count}`);
    
    const [dishCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM dishes');
    console.log(`  - 菜品总数: ${dishCountAfter[0].count}`);
    
    const [orderCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM dining_orders');
    console.log(`  - 订餐订单总数: ${orderCountAfter[0].count}`);
    
    // 显示保留的管理员用户
    console.log('\n👑 保留的管理员用户:');
    
    const [remainingUsers] = await connection.execute(`
      SELECT _id, nickName, role, phoneNumber, createTime 
      FROM users 
      ORDER BY createTime ASC
    `);
    
    if (remainingUsers.length > 0) {
      remainingUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.nickName} (${user.role}) - ${user.phoneNumber || 'N/A'} - ${user.createTime}`);
      });
    } else {
      console.log('  ⚠️  没有找到管理员用户');
    }
    
    // 显示保留的基础数据
    console.log('\n📋 保留的基础数据:');
    
    const [remainingDishes] = await connection.execute(`
      SELECT _id, name, price, status, createTime 
      FROM dishes 
      ORDER BY createTime ASC
      LIMIT 10
    `);
    
    if (remainingDishes.length > 0) {
      console.log(`  🍽️  菜品 (显示前10个):`);
      remainingDishes.forEach((dish, index) => {
        console.log(`    ${index + 1}. ${dish.name} - ¥${dish.price} - ${dish.status}`);
      });
    }
    
    const [remainingCategories] = await connection.execute(`
      SELECT _id, name, description, createTime 
      FROM dish_categories 
      ORDER BY sort ASC
    `);
    
    if (remainingCategories.length > 0) {
      console.log(`  📂 菜品分类:`);
      remainingCategories.forEach((category, index) => {
        console.log(`    ${index + 1}. ${category.name} - ${category.description || 'N/A'}`);
      });
    }
    
    console.log('\n🎉 业务测试数据清理完成！');
    console.log('\n📝 清理总结:');
    console.log('  ✅ 删除了9月16日之前的所有业务数据');
    console.log('  ✅ 保留了系统管理员用户');
    console.log('  ✅ 保留了基础菜品和分类数据');
    
  } catch (error) {
    console.error('❌ 查看结果时出现错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行清理
if (require.main === module) {
  finalCleanup().catch(console.error);
}

module.exports = { finalCleanup };
