const mysql = require('mysql2/promise');
const config = require('./config/database');
const logger = require('./utils/logger');

/**
 * 调试用户部门信息问题
 */

// 提取数据库配置
const dbConfig = config.database;

async function debugUserDepartment() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始调试用户部门信息...');

    // 1. 检查特定用户的数据库记录
    const userId = '12e4db1e-8ff5-4c68-a7ed-8e239885f401'; // 部门管理员测试的ID
    
    const [userRows] = await connection.execute(`
      SELECT _id, nickName, department, departmentId, role, status
      FROM users 
      WHERE _id = ?
    `, [userId]);

    if (userRows.length > 0) {
      const user = userRows[0];
      logger.info('数据库中的用户信息:');
      logger.info({
        _id: user._id,
        nickName: user.nickName,
        department: user.department,
        departmentId: user.departmentId,
        role: user.role,
        status: user.status
      });
      
      // 检查departmentId的类型
      logger.info(`departmentId类型: ${typeof user.departmentId}`);
      logger.info(`departmentId是否为null: ${user.departmentId === null}`);
      logger.info(`departmentId是否为undefined: ${user.departmentId === undefined}`);
    } else {
      logger.error('未找到用户');
    }

    // 2. 检查技术部是否存在
    const [deptRows] = await connection.execute(`
      SELECT _id, name, code, status
      FROM departments 
      WHERE name = '技术部'
    `);

    if (deptRows.length > 0) {
      const dept = deptRows[0];
      logger.info('技术部信息:');
      logger.info({
        _id: dept._id,
        name: dept.name,
        code: dept.code,
        status: dept.status
      });
    } else {
      logger.error('未找到技术部');
    }

    // 3. 检查所有部门管理员
    const [adminUsers] = await connection.execute(`
      SELECT u._id, u.nickName, u.department, u.departmentId, u.role, d.name as deptName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d._id
      WHERE u.role = 'dept_admin' AND u.status = 'active'
      ORDER BY u.department
    `);

    logger.info('\n所有部门管理员信息:');
    adminUsers.forEach(user => {
      logger.info(`${user.nickName} - ${user.department} (ID: ${user.departmentId || 'NULL'}) - 部门: ${user.deptName || 'NULL'}`);
    });

    // 4. 检查所有部门
    const [allDepts] = await connection.execute(`
      SELECT _id, name, code, status
      FROM departments 
      WHERE status = 'active'
      ORDER BY name
    `);

    logger.info('\n所有部门信息:');
    allDepts.forEach(dept => {
      logger.info(`${dept.name} (${dept.code}) - ID: ${dept._id}`);
    });

  } catch (error) {
    logger.error('调试失败:', error);
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
    await debugUserDepartment();
  } catch (error) {
    logger.error('调试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  debugUserDepartment
};
