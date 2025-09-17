#!/usr/bin/env node

/**
 * 清理业务测试数据脚本
 * 删除9月16日之前的测试数据，只保留系统管理员用户
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function cleanupTestData() {
  let connection;
  
  try {
    console.log('🧹 开始清理业务测试数据...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 设置时区为北京时间
    await connection.execute("SET time_zone = '+08:00'");
    
    // 开始事务
    await connection.beginTransaction();
    
    try {
      // 1. 备份当前数据统计
      console.log('\n📊 清理前数据统计:');
      
      const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`  - 用户总数: ${userCount[0].count}`);
      
      const [menuCount] = await connection.execute('SELECT COUNT(*) as count FROM menus');
      console.log(`  - 菜单总数: ${menuCount[0].count}`);
      
      const [dishCount] = await connection.execute('SELECT COUNT(*) as count FROM dishes');
      console.log(`  - 菜品总数: ${dishCount[0].count}`);
      
      const [reservationCount] = await connection.execute('SELECT COUNT(*) as count FROM reservations');
      console.log(`  - 预约总数: ${reservationCount[0].count}`);
      
      const [orderCount] = await connection.execute('SELECT COUNT(*) as count FROM dining_orders');
      console.log(`  - 订餐订单总数: ${orderCount[0].count}`);
      
      // 2. 删除9月16日之前的菜单数据
      console.log('\n🗑️  删除9月16日之前的菜单数据...');
      
      const [menuDeleteResult] = await connection.execute(`
        DELETE FROM menus 
        WHERE createTime < '2025-09-16 00:00:00'
      `);
      console.log(`  ✅ 删除了 ${menuDeleteResult.affectedRows} 条菜单记录`);
      
      // 3. 删除9月16日之前的菜单菜品关联数据
      console.log('\n🗑️  删除相关的菜单菜品关联数据...');
      
      const [menuDishDeleteResult] = await connection.execute(`
        DELETE FROM menu_dishes 
        WHERE menuId NOT IN (SELECT _id FROM menus)
      `);
      console.log(`  ✅ 删除了 ${menuDishDeleteResult.affectedRows} 条菜单菜品关联记录`);
      
      // 4. 删除9月16日之前的预约数据
      console.log('\n🗑️  删除9月16日之前的预约数据...');
      
      const [reservationDeleteResult] = await connection.execute(`
        DELETE FROM reservations 
        WHERE createTime < '2025-09-16 00:00:00'
      `);
      console.log(`  ✅ 删除了 ${reservationDeleteResult.affectedRows} 条预约记录`);
      
      // 5. 删除9月16日之前的订餐数据
      console.log('\n🗑️  删除9月16日之前的订餐数据...');
      
      const [orderDeleteResult] = await connection.execute(`
        DELETE FROM dining_orders 
        WHERE createTime < '2025-09-16 00:00:00'
      `);
      console.log(`  ✅ 删除了 ${orderDeleteResult.affectedRows} 条订餐订单记录`);
      
      // 6. 删除9月16日之前的就餐确认数据（如果表存在）
      console.log('\n🗑️  删除9月16日之前的就餐确认数据...');
      try {
        const [confirmationDeleteResult] = await connection.execute(`
          DELETE FROM dining_confirmations 
          WHERE createTime < '2025-09-16 00:00:00'
        `);
        console.log(`  ✅ 删除了 ${confirmationDeleteResult.affectedRows} 条就餐确认记录`);
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log('  ⚠️  表 dining_confirmations 不存在，跳过');
        } else {
          throw error;
        }
      }
      
      // 7. 删除9月16日之前的公告数据（如果表存在）
      console.log('\n🗑️  删除9月16日之前的公告数据...');
      try {
        const [noticeDeleteResult] = await connection.execute(`
          DELETE FROM system_notices 
          WHERE createTime < '2025-09-16 00:00:00'
        `);
        console.log(`  ✅ 删除了 ${noticeDeleteResult.affectedRows} 条公告记录`);
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log('  ⚠️  表 system_notices 不存在，跳过');
        } else {
          throw error;
        }
      }
      
      // 8. 删除9月16日之前的活动日志数据（如果表存在）
      console.log('\n🗑️  删除9月16日之前的活动日志数据...');
      try {
        const [logDeleteResult] = await connection.execute(`
          DELETE FROM activity_logs 
          WHERE createTime < '2025-09-16 00:00:00'
        `);
        console.log(`  ✅ 删除了 ${logDeleteResult.affectedRows} 条活动日志记录`);
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log('  ⚠️  表 activity_logs 不存在，跳过');
        } else {
          throw error;
        }
      }
      
      // 9. 清理用户数据，只保留系统管理员
      console.log('\n👥 清理用户数据，只保留系统管理员...');
      
      // 首先查看系统管理员用户
      const [adminUsers] = await connection.execute(`
        SELECT _id, nickName, role, createTime 
        FROM users 
        WHERE role = 'sys_admin' OR role = 'admin'
      `);
      
      console.log(`  📋 找到 ${adminUsers.length} 个管理员用户:`);
      adminUsers.forEach(user => {
        console.log(`    - ${user.nickName} (${user.role}) - ${user.createTime}`);
      });
      
      // 删除非管理员用户
      const [userDeleteResult] = await connection.execute(`
        DELETE FROM users 
        WHERE role NOT IN ('sys_admin', 'admin')
      `);
      console.log(`  ✅ 删除了 ${userDeleteResult.affectedRows} 个非管理员用户`);
      
      // 10. 清理菜品数据（保留基础菜品）
      console.log('\n🍽️  清理菜品数据...');
      
      // 删除测试菜品，保留基础菜品
      const [dishDeleteResult] = await connection.execute(`
        DELETE FROM dishes 
        WHERE createTime < '2025-09-16 00:00:00' 
        OR name LIKE '%测试%' 
        OR name LIKE '%test%'
      `);
      console.log(`  ✅ 删除了 ${dishDeleteResult.affectedRows} 个测试菜品`);
      
      // 11. 清理菜品分类数据（保留基础分类）
      console.log('\n📂 清理菜品分类数据...');
      
      const [categoryDeleteResult] = await connection.execute(`
        DELETE FROM dish_categories 
        WHERE createTime < '2025-09-16 00:00:00'
        OR name LIKE '%测试%'
      `);
      console.log(`  ✅ 删除了 ${categoryDeleteResult.affectedRows} 个测试分类`);
      
      // 12. 重置自增ID（可选）
      console.log('\n🔄 重置自增ID...');
      
      // 重置各个表的自增ID
      const tablesToReset = [
        'activity_logs',
        'dining_confirmations', 
        'dining_orders',
        'reservations',
        'system_notices'
      ];
      
      for (const table of tablesToReset) {
        try {
          await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
          console.log(`  ✅ 重置 ${table} 自增ID`);
        } catch (error) {
          if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_NO_SUCH_TABLE_IN_ENGINE') {
            console.log(`  ⚠️  表 ${table} 不存在，跳过`);
          } else {
            console.log(`  ⚠️  重置 ${table} 自增ID 失败: ${error.message}`);
          }
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log('\n✅ 数据清理事务提交成功');
      
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      console.log('\n❌ 数据清理失败，已回滚事务');
      throw error;
    }
    
    // 13. 清理后数据统计
    console.log('\n📊 清理后数据统计:');
    
    const [userCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`  - 用户总数: ${userCountAfter[0].count}`);
    
    const [menuCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM menus');
    console.log(`  - 菜单总数: ${menuCountAfter[0].count}`);
    
    const [dishCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM dishes');
    console.log(`  - 菜品总数: ${dishCountAfter[0].count}`);
    
    const [reservationCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM reservations');
    console.log(`  - 预约总数: ${reservationCountAfter[0].count}`);
    
    const [orderCountAfter] = await connection.execute('SELECT COUNT(*) as count FROM dining_orders');
    console.log(`  - 订餐订单总数: ${orderCountAfter[0].count}`);
    
    // 14. 显示保留的管理员用户
    console.log('\n👑 保留的管理员用户:');
    
    const [remainingUsers] = await connection.execute(`
      SELECT _id, nickName, role, phoneNumber, createTime 
      FROM users 
      ORDER BY createTime ASC
    `);
    
    if (remainingUsers.length > 0) {
      remainingUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.nickName} (${user.role}) - ${user.phoneNumber} - ${user.createTime}`);
      });
    } else {
      console.log('  ⚠️  没有找到管理员用户');
    }
    
    // 15. 显示保留的基础数据
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
        console.log(`    ${index + 1}. ${category.name} - ${category.description}`);
      });
    }
    
    console.log('\n🎉 业务测试数据清理完成！');
    console.log('\n📝 清理总结:');
    console.log('  ✅ 删除了9月16日之前的所有业务数据');
    console.log('  ✅ 保留了系统管理员用户');
    console.log('  ✅ 保留了基础菜品和分类数据');
    console.log('  ✅ 重置了相关表的自增ID');
    
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行清理
if (require.main === module) {
  cleanupTestData().catch(console.error);
}

module.exports = { cleanupTestData };
