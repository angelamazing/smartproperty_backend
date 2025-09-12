const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 快速修复数据库脚本
 * 专门解决当前遇到的问题
 */

async function quickFixDatabase() {
  let connection;
  
  try {
    logger.info('开始快速修复数据库...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    logger.info('数据库连接成功');
    
    // 检查并修复用户表
    logger.info('检查用户表结构...');
    try {
      const [userColumns] = await connection.query("SHOW COLUMNS FROM users WHERE Field IN ('isTestUser', 'isAdminTest', 'isSysAdminTest')");
      const existingFields = userColumns.map(col => col.Field);
      
      if (!existingFields.includes('isAdminTest')) {
        logger.info('添加 isAdminTest 字段...');
        await connection.query('ALTER TABLE users ADD COLUMN isAdminTest BOOLEAN DEFAULT FALSE COMMENT "是否为部门管理员测试用户"');
      }
      
      if (!existingFields.includes('isSysAdminTest')) {
        logger.info('添加 isSysAdminTest 字段...');
        await connection.query('ALTER TABLE users ADD COLUMN isSysAdminTest BOOLEAN DEFAULT FALSE COMMENT "是否为系统管理员测试用户"');
      }
      
      logger.info('✅ 用户表结构修复完成');
    } catch (error) {
      logger.warn('用户表可能不存在，尝试创建...');
      
      // 创建基础用户表
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          _id VARCHAR(36) PRIMARY KEY,
          openid VARCHAR(100) UNIQUE,
          unionid VARCHAR(100),
          nickName VARCHAR(100) NOT NULL,
          avatarUrl TEXT,
          phoneNumber VARCHAR(11) UNIQUE,
          email VARCHAR(100),
          gender TINYINT DEFAULT 0,
          country VARCHAR(50),
          province VARCHAR(50),
          city VARCHAR(50),
          language VARCHAR(20) DEFAULT 'zh_CN',
          department VARCHAR(100),
          role ENUM('user', 'dept_admin', 'sys_admin', 'verifier') DEFAULT 'user',
          status ENUM('active', 'inactive') DEFAULT 'active',
          createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          lastLoginTime TIMESTAMP NULL,
          isTestUser BOOLEAN DEFAULT FALSE,
          isAdminTest BOOLEAN DEFAULT FALSE,
          isSysAdminTest BOOLEAN DEFAULT FALSE,
          
          INDEX idx_openid (openid),
          INDEX idx_phone (phoneNumber),
          INDEX idx_role (role),
          INDEX idx_test_users (isTestUser, isAdminTest, isSysAdminTest)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      logger.info('✅ 用户表创建完成');
    }
    
    // 检查并创建用户令牌表
    logger.info('检查用户令牌表...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS user_tokens (
          _id VARCHAR(36) PRIMARY KEY,
          userId VARCHAR(36) NOT NULL,
          openid VARCHAR(100),
          phoneNumber VARCHAR(11),
          token TEXT NOT NULL,
          createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expireTime TIMESTAMP NOT NULL,
          lastUsedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          isTestToken BOOLEAN DEFAULT FALSE,
          
          INDEX idx_user_id (userId),
          INDEX idx_expire_time (expireTime),
          FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      logger.info('✅ 用户令牌表检查完成');
    } catch (error) {
      logger.warn('用户令牌表创建可能失败（外键约束）:', error.message);
    }
    
    // 检查并创建验证码表
    logger.info('检查验证码表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        _id VARCHAR(36) PRIMARY KEY,
        phoneNumber VARCHAR(11) NOT NULL,
        code VARCHAR(6) NOT NULL,
        status ENUM('unused', 'used', 'expired') DEFAULT 'unused',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expireTime TIMESTAMP NOT NULL,
        usedTime TIMESTAMP NULL,
        
        INDEX idx_phone_code (phoneNumber, code),
        INDEX idx_expire_time (expireTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    logger.info('✅ 验证码表检查完成');
    
    // 验证修复结果
    logger.info('验证修复结果...');
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const requiredTables = ['users', 'user_tokens', 'verification_codes'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length === 0) {
      logger.info('✅ 所有必需表都存在');
      
      // 验证用户表字段
      const [userColumns] = await connection.query("SHOW COLUMNS FROM users WHERE Field IN ('isTestUser', 'isAdminTest', 'isSysAdminTest')");
      const existingFields = userColumns.map(col => col.Field);
      
      logger.info('📋 用户表测试字段检查:');
      logger.info(`   - isTestUser: ${existingFields.includes('isTestUser') ? '✅' : '❌'}`);
      logger.info(`   - isAdminTest: ${existingFields.includes('isAdminTest') ? '✅' : '❌'}`);
      logger.info(`   - isSysAdminTest: ${existingFields.includes('isSysAdminTest') ? '✅' : '❌'}`);
      
      logger.info('🎉 数据库快速修复完成！现在可以测试接口了');
      return true;
    } else {
      logger.error('❌ 仍缺少以下表:', missingTables);
      return false;
    }
    
  } catch (error) {
    logger.error('快速修复失败:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  quickFixDatabase()
    .then(success => {
      if (success) {
        console.log('\n🚀 修复成功！现在可以：');
        console.log('   1. 启动服务: npm run dev');
        console.log('   2. 测试接口: npm run test-interfaces');
        console.log('   3. 完整初始化: npm run init-db-complete');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 修复过程出错:', error);
      process.exit(1);
    });
}

module.exports = { quickFixDatabase };
