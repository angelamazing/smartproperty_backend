const mysql = require('mysql2/promise');
const config = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * 创建测试管理员用户脚本
 */

async function createTestAdmin() {
  let connection;
  
  try {
    logger.info('开始创建测试管理员用户...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    logger.info('数据库连接成功');
    
    // 获取技术部门ID
    const [deptRows] = await connection.query(
      'SELECT _id FROM departments WHERE name = ? LIMIT 1',
      ['技术部']
    );
    
    const departmentId = deptRows.length > 0 ? deptRows[0]._id : null;
    logger.info('技术部门ID:', departmentId);
    
    // 创建部门管理员测试用户
    const adminUser = {
      _id: uuidv4(),
      nickName: '部门管理员测试',
      phoneNumber: '13800000001',
      department: '技术部',
      departmentId: departmentId,
      role: 'dept_admin',
      status: 'active',
      isTestUser: true,
      isAdminTest: true
    };
    
    // 检查用户是否已存在
    const [existingAdmin] = await connection.query(
      'SELECT _id FROM users WHERE phoneNumber = ?',
      [adminUser.phoneNumber]
    );
    
    if (existingAdmin.length > 0) {
      // 更新现有用户
      await connection.query(
        `UPDATE users SET 
         nickName = ?, department = ?, departmentId = ?, 
         role = ?, status = ?, isTestUser = ?, isAdminTest = ?, 
         updateTime = NOW()
         WHERE phoneNumber = ?`,
        [
          adminUser.nickName, adminUser.department, adminUser.departmentId,
          adminUser.role, adminUser.status, adminUser.isTestUser, adminUser.isAdminTest,
          adminUser.phoneNumber
        ]
      );
      logger.info('✅ 部门管理员测试用户已更新');
    } else {
      // 创建新用户
      await connection.query(
        `INSERT INTO users (_id, nickName, phoneNumber, department, departmentId, role, status, isTestUser, isAdminTest, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          adminUser._id, adminUser.nickName, adminUser.phoneNumber, adminUser.department,
          adminUser.departmentId, adminUser.role, adminUser.status, adminUser.isTestUser, adminUser.isAdminTest
        ]
      );
      logger.info('✅ 部门管理员测试用户已创建');
    }
    
    // 创建系统管理员测试用户
    const sysAdminUser = {
      _id: uuidv4(),
      nickName: '系统管理员测试',
      phoneNumber: '13800000002',
      department: '技术部',
      departmentId: departmentId,
      role: 'sys_admin',
      status: 'active',
      isTestUser: true,
      isSysAdminTest: true
    };
    
    // 检查系统管理员是否已存在
    const [existingSysAdmin] = await connection.query(
      'SELECT _id FROM users WHERE phoneNumber = ?',
      [sysAdminUser.phoneNumber]
    );
    
    if (existingSysAdmin.length > 0) {
      // 更新现有系统管理员
      await connection.query(
        `UPDATE users SET 
         nickName = ?, department = ?, departmentId = ?, 
         role = ?, status = ?, isTestUser = ?, isSysAdminTest = ?, 
         updateTime = NOW()
         WHERE phoneNumber = ?`,
        [
          sysAdminUser.nickName, sysAdminUser.department, sysAdminUser.departmentId,
          sysAdminUser.role, sysAdminUser.status, sysAdminUser.isTestUser, sysAdminUser.isSysAdminTest,
          sysAdminUser.phoneNumber
        ]
      );
      logger.info('✅ 系统管理员测试用户已更新');
    } else {
      // 创建新系统管理员
      await connection.query(
        `INSERT INTO users (_id, nickName, phoneNumber, department, departmentId, role, status, isTestUser, isSysAdminTest, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          sysAdminUser._id, sysAdminUser.nickName, sysAdminUser.phoneNumber, sysAdminUser.department,
          sysAdminUser.departmentId, sysAdminUser.role, sysAdminUser.status, sysAdminUser.isTestUser, sysAdminUser.isSysAdminTest
        ]
      );
      logger.info('✅ 系统管理员测试用户已创建');
    }
    
    // 验证创建结果
    const [adminResult] = await connection.query(
      'SELECT _id, nickName, phoneNumber, role, status FROM users WHERE phoneNumber IN (?, ?)',
      [adminUser.phoneNumber, sysAdminUser.phoneNumber]
    );
    
    logger.info('📊 创建结果:');
    adminResult.forEach(user => {
      logger.info(`   - ${user.nickName} (${user.phoneNumber}) - ${user.role} - ${user.status}`);
    });
    
    logger.info('🎉 测试管理员用户创建完成！');
    
  } catch (error) {
    logger.error('创建测试管理员用户失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createTestAdmin().catch(console.error);
}

module.exports = { createTestAdmin };
