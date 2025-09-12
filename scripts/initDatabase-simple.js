const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 简化的数据库初始化脚本
 * 解决prepared statement不支持DDL语句的问题
 */

/**
 * 初始化数据库
 */
async function initDatabase() {
  let connection;
  
  try {
    logger.info('开始初始化数据库...');
    
    // 第一步：连接MySQL服务器（不指定数据库）
    const { database, ...connectionConfig } = config.database;
    logger.info('连接MySQL服务器...');
    
    connection = await mysql.createConnection(connectionConfig);
    
    // 第二步：创建数据库
    logger.info(`创建数据库 ${database}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    logger.info(`数据库 ${database} 创建成功`);
    
    // 第三步：关闭连接，重新连接到指定数据库
    await connection.end();
    logger.info('重新连接到数据库...');
    
    connection = await mysql.createConnection(config.database);
    logger.info('数据库连接成功');
    
    // 第四步：创建用户表（包含新的测试用户字段）
    logger.info('创建用户表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        _id VARCHAR(36) PRIMARY KEY COMMENT '用户ID',
        openid VARCHAR(100) UNIQUE COMMENT '微信openid',
        unionid VARCHAR(100) COMMENT '微信unionid',
        nickName VARCHAR(100) NOT NULL COMMENT '用户昵称',
        avatarUrl TEXT COMMENT '头像URL',
        phoneNumber VARCHAR(11) UNIQUE COMMENT '手机号',
        email VARCHAR(100) COMMENT '邮箱',
        gender TINYINT DEFAULT 0 COMMENT '性别: 0-未知,1-男,2-女',
        country VARCHAR(50) COMMENT '国家',
        province VARCHAR(50) COMMENT '省份',
        city VARCHAR(50) COMMENT '城市',
        language VARCHAR(20) DEFAULT 'zh_CN' COMMENT '语言',
        department VARCHAR(100) COMMENT '部门',
        role ENUM('user', 'dept_admin', 'sys_admin', 'verifier') DEFAULT 'user' COMMENT '角色',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        lastLoginTime TIMESTAMP NULL COMMENT '最后登录时间',
        isTestUser BOOLEAN DEFAULT FALSE COMMENT '是否为测试用户',
        isAdminTest BOOLEAN DEFAULT FALSE COMMENT '是否为部门管理员测试用户',
        isSysAdminTest BOOLEAN DEFAULT FALSE COMMENT '是否为系统管理员测试用户',
        
        INDEX idx_openid (openid),
        INDEX idx_unionid (unionid),
        INDEX idx_phone (phoneNumber),
        INDEX idx_department (department),
        INDEX idx_role (role),
        INDEX idx_status (status),
        INDEX idx_test_users (isTestUser, isAdminTest, isSysAdminTest),
        INDEX idx_create_time (createTime),
        INDEX idx_last_login (lastLoginTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `);
    logger.info('用户表创建成功');
    
    // 第五步：创建用户令牌表
    logger.info('创建用户令牌表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        _id VARCHAR(36) PRIMARY KEY COMMENT 'Token ID',
        userId VARCHAR(36) NOT NULL COMMENT '用户ID',
        openid VARCHAR(100) COMMENT '微信openid',
        phoneNumber VARCHAR(11) COMMENT '手机号',
        token TEXT NOT NULL COMMENT 'JWT Token',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        expireTime TIMESTAMP NOT NULL COMMENT '过期时间',
        lastUsedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后使用时间',
        isTestToken BOOLEAN DEFAULT FALSE COMMENT '是否为测试Token',
        
        INDEX idx_user_id (userId),
        INDEX idx_openid (openid),
        INDEX idx_phone (phoneNumber),
        INDEX idx_expire_time (expireTime),
        INDEX idx_last_used (lastUsedTime),
        FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户令牌表'
    `);
    logger.info('用户令牌表创建成功');
    
    // 第六步：创建验证码表
    logger.info('创建验证码表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        _id VARCHAR(36) PRIMARY KEY COMMENT '验证码ID',
        phoneNumber VARCHAR(11) NOT NULL COMMENT '手机号',
        code VARCHAR(6) NOT NULL COMMENT '验证码',
        status ENUM('unused', 'used', 'expired') DEFAULT 'unused' COMMENT '状态',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        expireTime TIMESTAMP NOT NULL COMMENT '过期时间',
        usedTime TIMESTAMP NULL COMMENT '使用时间',
        
        INDEX idx_phone_code (phoneNumber, code),
        INDEX idx_expire_time (expireTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证码表'
    `);
    logger.info('验证码表创建成功');
    
    // 第七步：验证表结构
    logger.info('验证表结构...');
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const expectedTables = ['users', 'user_tokens', 'verification_codes'];
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      throw new Error(`缺少以下表: ${missingTables.join(', ')}`);
    }
    
    // 检查用户表是否包含新字段
    const [userColumns] = await connection.query("SHOW COLUMNS FROM users WHERE Field IN ('isTestUser', 'isAdminTest', 'isSysAdminTest')");
    const existingFields = userColumns.map(col => col.Field);
    
    logger.info('✅ 用户表字段检查:');
    logger.info(`   - isTestUser: ${existingFields.includes('isTestUser') ? '✅ 存在' : '❌ 缺失'}`);
    logger.info(`   - isAdminTest: ${existingFields.includes('isAdminTest') ? '✅ 存在' : '❌ 缺失'}`);
    logger.info(`   - isSysAdminTest: ${existingFields.includes('isSysAdminTest') ? '✅ 存在' : '❌ 缺失'}`);
    
    logger.info('✅ 数据库初始化完成！');
    logger.info('📝 可以使用以下脚本继续完善数据库结构:');
    logger.info('   - npm run init-db-complete (完整初始化)');
    logger.info('   - npm run verify-db (验证数据库)');
    
    return true;
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
    case undefined:
      const success = await initDatabase();
      process.exit(success ? 0 : 1);
      break;
      
    default:
      console.log('简化数据库初始化脚本');
      console.log('');
      console.log('使用方法:');
      console.log('  node scripts/initDatabase-simple.js init  - 初始化基础数据库结构');
      console.log('  node scripts/initDatabase-simple.js       - 等同于 init');
      console.log('');
      console.log('注意: 此脚本仅创建基础表结构，完整初始化请使用 npm run init-db-complete');
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  initDatabase
};
