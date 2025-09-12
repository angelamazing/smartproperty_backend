/**
 * 扫码就餐登记功能数据库迁移脚本
 * 添加二维码管理和就餐登记相关表
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

// 新增表SQL语句
const createTableSQLs = {
  // 二维码管理表
  qr_codes: `
    CREATE TABLE IF NOT EXISTS qr_codes (
      _id VARCHAR(36) PRIMARY KEY COMMENT '二维码ID',
      code VARCHAR(100) UNIQUE NOT NULL COMMENT '二维码标识',
      name VARCHAR(100) NOT NULL COMMENT '二维码名称',
      location VARCHAR(200) COMMENT '张贴位置',
      description TEXT COMMENT '描述',
      status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_code (code),
      INDEX idx_name (name),
      INDEX idx_location (location),
      INDEX idx_status (status),
      INDEX idx_create_time (createTime)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二维码管理表'
  `,

  // 就餐登记表
  dining_registrations: `
    CREATE TABLE IF NOT EXISTS dining_registrations (
      _id VARCHAR(36) PRIMARY KEY COMMENT '登记ID',
      userId VARCHAR(36) NOT NULL COMMENT '用户ID',
      userName VARCHAR(50) NOT NULL COMMENT '用户姓名',
      qrCodeId VARCHAR(36) NOT NULL COMMENT '二维码ID',
      qrCode VARCHAR(100) NOT NULL COMMENT '二维码标识',
      scanTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '扫码时间',
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL COMMENT '餐次类型',
      diningDate DATE NOT NULL COMMENT '就餐日期',
      orderId VARCHAR(36) COMMENT '关联的报餐订单ID',
      status ENUM('success', 'failed') DEFAULT 'success' COMMENT '登记状态',
      failureReason TEXT COMMENT '失败原因',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      INDEX idx_user (userId),
      INDEX idx_qr_code (qrCodeId),
      INDEX idx_scan_time (scanTime),
      INDEX idx_dining_date (diningDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_order (orderId),
      INDEX idx_status (status),
      INDEX idx_create_time (createTime),
      UNIQUE KEY uk_user_date_meal (userId, diningDate, mealType),
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
      FOREIGN KEY (qrCodeId) REFERENCES qr_codes(_id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES dining_orders(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='就餐登记表'
  `
};

// 修改现有表的SQL语句
const alterTableSQLs = [
  // 为dining_orders表添加字段
  `ALTER TABLE dining_orders ADD COLUMN actualDiningTime TIMESTAMP NULL COMMENT '实际就餐时间'`,
  `ALTER TABLE dining_orders ADD COLUMN diningStatus ENUM('ordered', 'dined', 'cancelled') DEFAULT 'ordered' COMMENT '就餐状态'`,
  
  // 为dining_orders表添加索引
  `ALTER TABLE dining_orders ADD INDEX idx_dining_status (diningStatus)`,
  `ALTER TABLE dining_orders ADD INDEX idx_actual_dining_time (actualDiningTime)`
];

// 插入默认二维码数据
const insertDefaultDataSQLs = [
  `INSERT IGNORE INTO qr_codes (_id, code, name, location, description, status) VALUES 
    ('qr-main-001', 'DINING_QR_MAIN_001', '餐厅主入口二维码', '餐厅主入口', '餐厅主入口通用二维码，支持所有餐次登记', 'active'),
    ('qr-main-002', 'DINING_QR_MAIN_002', '餐厅A区二维码', '餐厅A区', '餐厅A区通用二维码，支持所有餐次登记', 'active'),
    ('qr-main-003', 'DINING_QR_MAIN_003', '餐厅B区二维码', '餐厅B区', '餐厅B区通用二维码，支持所有餐次登记', 'active')`
];

/**
 * 执行数据库迁移
 */
async function migrateDatabase() {
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(config.database);
    logger.info('开始执行扫码就餐登记功能数据库迁移...');

    // 1. 创建新表
    logger.info('创建新表...');
    for (const [tableName, sql] of Object.entries(createTableSQLs)) {
      await connection.execute(sql);
      logger.info(`✓ 表 ${tableName} 创建成功`);
    }

    // 2. 修改现有表
    logger.info('修改现有表...');
    for (const sql of alterTableSQLs) {
      try {
        await connection.execute(sql);
        logger.info(`✓ 表结构修改成功: ${sql.split(' ')[2]}`);
      } catch (error) {
        // 忽略字段已存在的错误
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
          logger.info(`⚠ 字段或索引已存在，跳过: ${sql.split(' ')[2]}`);
        } else {
          throw error;
        }
      }
    }

    // 3. 插入默认数据
    logger.info('插入默认数据...');
    for (const sql of insertDefaultDataSQLs) {
      await connection.execute(sql);
      logger.info('✓ 默认二维码数据插入成功');
    }

    logger.info('🎉 扫码就餐登记功能数据库迁移完成！');
    
    // 验证表结构
    await verifyTables(connection);
    
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 验证表结构
 */
async function verifyTables(connection) {
  try {
    logger.info('验证表结构...');
    
    // 检查新表是否存在
    const tables = ['qr_codes', 'dining_registrations'];
    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        logger.info(`✓ 表 ${table} 存在`);
        
        // 检查表结构
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        logger.info(`  - 字段数量: ${columns.length}`);
      } else {
        logger.error(`✗ 表 ${table} 不存在`);
      }
    }
    
    // 检查dining_orders表的新字段
    const [columns] = await connection.execute(`DESCRIBE dining_orders`);
    const newFields = ['actualDiningTime', 'diningStatus'];
    for (const field of newFields) {
      const fieldExists = columns.some(col => col.Field === field);
      if (fieldExists) {
        logger.info(`✓ dining_orders表字段 ${field} 存在`);
      } else {
        logger.error(`✗ dining_orders表字段 ${field} 不存在`);
      }
    }
    
    logger.info('表结构验证完成');
  } catch (error) {
    logger.error('表结构验证失败:', error);
  }
}

/**
 * 回滚迁移（删除新表和字段）
 */
async function rollbackMigration() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    logger.info('开始回滚扫码就餐登记功能数据库迁移...');

    // 删除新表
    const tables = ['dining_registrations', 'qr_codes'];
    for (const table of tables) {
      await connection.execute(`DROP TABLE IF EXISTS ${table}`);
      logger.info(`✓ 表 ${table} 已删除`);
    }

    // 删除dining_orders表的新字段
    const fields = ['diningStatus', 'actualDiningTime'];
    for (const field of fields) {
      try {
        await connection.execute(`ALTER TABLE dining_orders DROP COLUMN ${field}`);
        logger.info(`✓ dining_orders表字段 ${field} 已删除`);
      } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          logger.info(`⚠ dining_orders表字段 ${field} 不存在，跳过`);
        } else {
          throw error;
        }
      }
    }

    logger.info('🎉 数据库迁移回滚完成！');
  } catch (error) {
    logger.error('数据库迁移回滚失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch(error => {
        logger.error('回滚失败:', error);
        process.exit(1);
      });
  } else {
    migrateDatabase()
      .then(() => process.exit(0))
      .catch(error => {
        logger.error('迁移失败:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateDatabase,
  rollbackMigration
};
