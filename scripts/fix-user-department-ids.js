const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 修复用户departmentId为undefined的问题
 */

// 提取数据库配置
const dbConfig = config.database;

async function fixUserDepartmentIds() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始修复用户departmentId问题...');

    // 1. 查找所有departmentId为null或undefined的用户
    const [usersWithNullDept] = await connection.execute(`
      SELECT _id, nickName, department, departmentId, role
      FROM users 
      WHERE (departmentId IS NULL OR departmentId = '') 
      AND department IS NOT NULL 
      AND department != ''
      ORDER BY role DESC, nickName
    `);

    logger.info(`找到 ${usersWithNullDept.length} 个需要修复的用户`);

    if (usersWithNullDept.length === 0) {
      logger.info('没有需要修复的用户');
      return;
    }

    // 2. 获取所有部门信息
    const [departments] = await connection.execute(`
      SELECT _id, name FROM departments WHERE status = 'active'
    `);

    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept.name] = dept._id;
    });

    logger.info('部门映射:', deptMap);

    // 3. 修复每个用户的departmentId
    let fixedCount = 0;
    for (const user of usersWithNullDept) {
      const departmentId = deptMap[user.department];
      
      if (departmentId) {
        await connection.execute(`
          UPDATE users 
          SET departmentId = ?, updateTime = NOW()
          WHERE _id = ?
        `, [departmentId, user._id]);

        logger.info(`✅ 修复用户: ${user.nickName} (${user.department}) -> ${departmentId}`);
        fixedCount++;
      } else {
        logger.warn(`⚠️  未找到部门: ${user.department} (用户: ${user.nickName})`);
      }
    }

    logger.info(`\n修复完成！共修复了 ${fixedCount} 个用户`);

    // 4. 验证修复结果
    logger.info('\n=== 验证修复结果 ===');
    const [deptAdminUsers] = await connection.execute(`
      SELECT u._id, u.nickName, u.department, u.departmentId, u.role, d.name as deptName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d._id
      WHERE u.role = 'dept_admin' AND u.status = 'active'
      ORDER BY u.department
    `);

    deptAdminUsers.forEach(user => {
      const status = user.departmentId ? '✅' : '❌';
      logger.info(`${status} ${user.nickName} - ${user.department} (ID: ${user.departmentId || 'NULL'})`);
    });

    // 5. 统计各部门成员数量
    logger.info('\n=== 各部门成员统计 ===');
    for (const dept of departments) {
      const [memberCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE departmentId = ? AND status = 'active'
      `, [dept._id]);

      const [adminCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE departmentId = ? AND role = 'dept_admin' AND status = 'active'
      `, [dept._id]);

      const [userCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE departmentId = ? AND role = 'user' AND status = 'active'
      `, [dept._id]);

      logger.info(`${dept.name}: 总计 ${memberCount[0].count} 人 (管理员: ${adminCount[0].count}, 普通用户: ${userCount[0].count})`);
    }

  } catch (error) {
    logger.error('修复用户departmentId失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('开始修复用户departmentId问题...');
    
    await fixUserDepartmentIds();
    
    logger.info('\n🎉 用户departmentId修复完成！');
    
    console.log('\n=== 修复完成 ===');
    console.log('✅ 已修复所有用户的departmentId字段');
    console.log('✅ 部门管理员现在可以正常获取部门成员');
    console.log('✅ 可以开始测试部门报餐功能');
    
  } catch (error) {
    logger.error('修复失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  fixUserDepartmentIds
};
