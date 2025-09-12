const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 数据库初始化脚本
 * 创建所有必要的表结构
 */

// 数据库表创建SQL语句
const createTableSQLs = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      _id VARCHAR(36) PRIMARY KEY,
      openid VARCHAR(100) UNIQUE,
      unionid VARCHAR(100),
      nickName VARCHAR(100) NOT NULL,
      avatarUrl TEXT,
      phoneNumber VARCHAR(11) UNIQUE,
      email VARCHAR(100),
      gender TINYINT DEFAULT 0 COMMENT '0-未知,1-男,2-女',
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
      isAdminTest BOOLEAN DEFAULT FALSE COMMENT '是否为部门管理员测试用户',
      isSysAdminTest BOOLEAN DEFAULT FALSE COMMENT '是否为系统管理员测试用户',
      INDEX idx_openid (openid),
      INDEX idx_unionid (unionid),
      INDEX idx_phone (phoneNumber),
      INDEX idx_department (department),
      INDEX idx_role (role),
      INDEX idx_status (status),
      INDEX idx_test_users (isTestUser, isAdminTest, isSysAdminTest)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
  `,
  
  // 用户令牌表
  user_tokens: `
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
      INDEX idx_openid (openid),
      INDEX idx_phone (phoneNumber),
      INDEX idx_expire_time (expireTime),
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户令牌表'
  `,
  
  // 验证码表
  verification_codes: `
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证码表'
  `,
  
  // 菜单表
  menus: `
    CREATE TABLE IF NOT EXISTS menus (
      _id VARCHAR(36) PRIMARY KEY,
      publishDate DATE NOT NULL,
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL,
      mealTime VARCHAR(50),
      publishStatus ENUM('draft', 'published', 'archived') DEFAULT 'draft',
      publisherId VARCHAR(36),
      dishes JSON,
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_date_meal (publishDate, mealType),
      INDEX idx_publish_date (publishDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_status (publishStatus),
      FOREIGN KEY (publisherId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表'
  `,
  
  // 日常报餐记录表
  dining_orders: `
    CREATE TABLE IF NOT EXISTS dining_orders (
      _id VARCHAR(36) PRIMARY KEY,
      deptId VARCHAR(100),
      deptName VARCHAR(100),
      registrantId VARCHAR(36) NOT NULL,
      memberIds JSON NOT NULL,
      memberNames JSON NOT NULL,
      memberCount INT NOT NULL,
      diningDate DATE NOT NULL,
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL,
      status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
      remark TEXT,
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_registrant (registrantId),
      INDEX idx_dining_date (diningDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_status (status),
      INDEX idx_dept (deptId),
      FOREIGN KEY (registrantId) REFERENCES users(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日常报餐记录表'
  `,
  
  // 特殊预约表
  special_reservations: `
    CREATE TABLE IF NOT EXISTS special_reservations (
      _id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      phone VARCHAR(11) NOT NULL,
      department VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      mealTime VARCHAR(50) NOT NULL,
      peopleCount INT NOT NULL,
      specialRequirements TEXT,
      selectedDishes JSON,
      totalAmount DECIMAL(10,2) DEFAULT 0,
      status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
      auditComment TEXT,
      auditorId VARCHAR(36),
      auditTime TIMESTAMP NULL,
      submitTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      isSpecialReservation BOOLEAN DEFAULT TRUE,
      INDEX idx_name (name),
      INDEX idx_phone (phone),
      INDEX idx_date (date),
      INDEX idx_status (status),
      INDEX idx_department (department),
      FOREIGN KEY (auditorId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='特殊预约表'
  `,
  
  // 场地表
  venues: `
    CREATE TABLE IF NOT EXISTS venues (
      _id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type ENUM('badminton', 'pingpong', 'basketball', 'other') NOT NULL,
      capacity INT NOT NULL DEFAULT 4,
      price DECIMAL(10,2) DEFAULT 0,
      description TEXT,
      status ENUM('open', 'closed', 'maintenance') DEFAULT 'open',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地表'
  `,
  
  // 场地预约表
  reservations: `
    CREATE TABLE IF NOT EXISTS reservations (
      _id VARCHAR(36) PRIMARY KEY,
      venueId VARCHAR(36) NOT NULL,
      venueName VARCHAR(100) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      reservationDate DATE NOT NULL,
      startTime TIME NOT NULL,
      endTime TIME NOT NULL,
      userName VARCHAR(50) NOT NULL,
      phoneNumber VARCHAR(11) NOT NULL,
      purpose VARCHAR(200) NOT NULL,
      remark TEXT,
      status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_venue (venueId),
      INDEX idx_user (userId),
      INDEX idx_date (reservationDate),
      INDEX idx_time (startTime, endTime),
      INDEX idx_status (status),
      FOREIGN KEY (venueId) REFERENCES venues(_id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地预约表'
  `,
  
  // 餐桌表
  dining_tables: `
    CREATE TABLE IF NOT EXISTS dining_tables (
      _id VARCHAR(36) PRIMARY KEY,
      tableName VARCHAR(50) NOT NULL UNIQUE,
      location VARCHAR(100),
      maxCapacity INT NOT NULL DEFAULT 6,
      currentPeople INT DEFAULT 0,
      verificationCode VARCHAR(20) UNIQUE,
      status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
      occupiedTime TIMESTAMP NULL,
      remarks TEXT,
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_table_name (tableName),
      INDEX idx_verification_code (verificationCode),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='餐桌表'
  `,
  
  // 用餐验证记录表
  dining_verifications: `
    CREATE TABLE IF NOT EXISTS dining_verifications (
      _id VARCHAR(36) PRIMARY KEY,
      verificationCode VARCHAR(20) NOT NULL,
      tableId VARCHAR(36),
      tableName VARCHAR(50),
      tableLocation VARCHAR(100),
      diningPeople INT NOT NULL,
      remarks TEXT,
      verifyTime TIMESTAMP NOT NULL,
      status ENUM('verified', 'rejected') DEFAULT 'verified',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_verification_code (verificationCode),
      INDEX idx_table (tableId),
      INDEX idx_verify_time (verifyTime),
      INDEX idx_status (status),
      FOREIGN KEY (tableId) REFERENCES dining_tables(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用餐验证记录表'
  `
};

// 初始化数据SQL
const initDataSQLs = [
  // 创建系统管理员用户
  `INSERT IGNORE INTO users (_id, nickName, role, status, department, createTime, updateTime) 
   VALUES ('sys-admin-001', '系统管理员', 'sys_admin', 'active', '系统管理部', NOW(), NOW())`,
  
  // 创建测试用户
  `INSERT IGNORE INTO users (_id, nickName, role, status, department, isTestUser, createTime, updateTime) 
   VALUES ('test-user-001', '测试用户', 'user', 'active', '测试部门', TRUE, NOW(), NOW())`,
  
  // 创建示例场地
  `INSERT IGNORE INTO venues (_id, name, type, capacity, price, description, status, createTime, updateTime) VALUES
   ('venue-badminton-001', '羽毛球场A', 'badminton', 4, 50.00, '标准羽毛球场地，设施完善', 'open', NOW(), NOW()),
   ('venue-badminton-002', '羽毛球场B', 'badminton', 4, 50.00, '标准羽毛球场地，设施完善', 'open', NOW(), NOW()),
   ('venue-pingpong-001', '乒乓球台1', 'pingpong', 2, 30.00, '标准乒乓球台', 'open', NOW(), NOW()),
   ('venue-pingpong-002', '乒乓球台2', 'pingpong', 2, 30.00, '标准乒乓球台', 'open', NOW(), NOW()),
   ('venue-basketball-001', '篮球场', 'basketball', 10, 100.00, '标准篮球场', 'open', NOW(), NOW())`,
  
  // 创建示例餐桌
  `INSERT IGNORE INTO dining_tables (_id, tableName, location, maxCapacity, verificationCode, status, createTime, updateTime) VALUES
   ('table-a001', 'A区01号桌', 'A区', 6, 'A001', 'available', NOW(), NOW()),
   ('table-a002', 'A区02号桌', 'A区', 6, 'A002', 'available', NOW(), NOW()),
   ('table-a003', 'A区03号桌', 'A区', 4, 'A003', 'available', NOW(), NOW()),
   ('table-b001', 'B区01号桌', 'B区', 8, 'B001', 'available', NOW(), NOW()),
   ('table-b002', 'B区02号桌', 'B区', 8, 'B002', 'available', NOW(), NOW()),
   ('table-b003', 'B区03号桌', 'B区', 6, 'B003', 'available', NOW(), NOW())`
];

/**
 * 初始化数据库
 */
async function initDatabase() {
  let connection;
  
  try {
    logger.info('开始初始化数据库...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      charset: config.database.charset
    });
    
    // 创建数据库（如果不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    logger.info(`数据库 ${config.database.database} 创建成功`);
    
    // 选择数据库
    await connection.query(`USE \`${config.database.database}\``);
    
    // 创建表
    logger.info('开始创建数据表...');
    for (const [tableName, sql] of Object.entries(createTableSQLs)) {
      try {
        await connection.query(sql);
        logger.info(`表 ${tableName} 创建成功`);
      } catch (error) {
        logger.error(`创建表 ${tableName} 失败:`, error);
        throw error;
      }
    }
    
    // 插入初始化数据
    logger.info('开始插入初始化数据...');
    for (const sql of initDataSQLs) {
      try {
        await connection.query(sql);
      } catch (error) {
        logger.warn('插入初始化数据时出现警告:', error.message);
      }
    }
    
    logger.info('数据库初始化完成！');
    
    // 显示表信息
    const [tables] = await connection.query('SHOW TABLES');
    logger.info(`共创建了 ${tables.length} 个表:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      logger.info(`  - ${tableName}`);
    });
    
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 检查数据库连接
 */
async function checkConnection() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config.database);
    await connection.ping();
    logger.info('数据库连接测试成功');
    
    // 检查表是否存在
    const [tables] = await connection.execute('SHOW TABLES');
    if (tables.length === 0) {
      logger.warn('数据库中没有表，建议运行初始化脚本');
    } else {
      logger.info(`数据库中共有 ${tables.length} 个表`);
    }
    
  } catch (error) {
    logger.error('数据库连接测试失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 重置数据库（危险操作）
 */
async function resetDatabase() {
  let connection;
  
  try {
    logger.warn('警告：即将重置数据库，所有数据将被删除！');
    
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      charset: config.database.charset
    });
    
    // 删除数据库
    await connection.execute(`DROP DATABASE IF EXISTS \`${config.database.database}\``);
    logger.info(`数据库 ${config.database.database} 已删除`);
    
    // 重新初始化
    await connection.end();
    await initDatabase();
    
  } catch (error) {
    logger.error('重置数据库失败:', error);
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'init':
    initDatabase();
    break;
  case 'check':
    checkConnection();
    break;
  case 'reset':
    resetDatabase();
    break;
  default:
    console.log(`
使用方法:
  node initDatabase.js init   - 初始化数据库和表结构
  node initDatabase.js check  - 检查数据库连接
  node initDatabase.js reset  - 重置数据库（危险操作）
    `);
    break;
}
