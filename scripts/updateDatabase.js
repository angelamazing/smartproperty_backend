const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 数据库更新脚本
 * 用于添加新的测试用户字段
 */

// 需要添加的字段
const newFields = [
  {
    table: 'users',
    field: 'isAdminTest',
    definition: 'BOOLEAN DEFAULT FALSE COMMENT "是否为部门管理员测试用户"'
  },
  {
    table: 'users',
    field: 'isSysAdminTest', 
    definition: 'BOOLEAN DEFAULT FALSE COMMENT "是否为系统管理员测试用户"'
  }
];

// 需要添加的索引
const newIndexes = [
  {
    table: 'users',
    name: 'idx_test_users',
    columns: ['isTestUser', 'isAdminTest', 'isSysAdminTest']
  }
];

/**
 * 检查字段是否存在
 */
async function checkFieldExists(connection, table, field) {
  try {
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [config.database.database, table, field]
    );
    return rows.length > 0;
  } catch (error) {
    logger.error(`检查字段 ${table}.${field} 失败:`, error);
    return false;
  }
}

/**
 * 检查索引是否存在
 */
async function checkIndexExists(connection, table, indexName) {
  try {
    const [rows] = await connection.execute(
      `SHOW INDEX FROM ${table} WHERE Key_name = ?`,
      [indexName]
    );
    return rows.length > 0;
  } catch (error) {
    logger.error(`检查索引 ${table}.${indexName} 失败:`, error);
    return false;
  }
}

/**
 * 添加字段
 */
async function addField(connection, table, field, definition) {
  try {
    const exists = await checkFieldExists(connection, table, field);
    if (exists) {
      logger.info(`字段 ${table}.${field} 已存在，跳过`);
      return true;
    }

    const sql = `ALTER TABLE ${table} ADD COLUMN ${field} ${definition}`;
    await connection.execute(sql);
    logger.info(`字段 ${table}.${field} 添加成功`);
    return true;
  } catch (error) {
    logger.error(`添加字段 ${table}.${field} 失败:`, error);
    return false;
  }
}

/**
 * 添加索引
 */
async function addIndex(connection, table, indexName, columns) {
  try {
    const exists = await checkIndexExists(connection, table, indexName);
    if (exists) {
      logger.info(`索引 ${table}.${indexName} 已存在，跳过`);
      return true;
    }

    const sql = `ALTER TABLE ${table} ADD INDEX ${indexName} (${columns.join(', ')})`;
    await connection.execute(sql);
    logger.info(`索引 ${table}.${indexName} 添加成功`);
    return true;
  } catch (error) {
    logger.error(`添加索引 ${table}.${indexName} 失败:`, error);
    return false;
  }
}

/**
 * 主更新函数
 */
async function updateDatabase() {
  let connection;
  
  try {
    logger.info('开始更新数据库...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    logger.info('数据库连接成功');
    
    // 添加新字段
    logger.info('开始添加新字段...');
    for (const field of newFields) {
      const success = await addField(connection, field.table, field.field, field.definition);
      if (!success) {
        logger.error(`字段 ${field.table}.${field.field} 添加失败`);
        return false;
      }
    }
    
    // 添加新索引
    logger.info('开始添加新索引...');
    for (const index of newIndexes) {
      const success = await addIndex(connection, index.table, index.name, index.columns);
      if (!success) {
        logger.error(`索引 ${index.table}.${index.name} 添加失败`);
        return false;
      }
    }
    
    logger.info('数据库更新完成！');
    return true;
    
  } catch (error) {
    logger.error('数据库更新失败:', error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

/**
 * 验证更新结果
 */
async function verifyUpdate() {
  let connection;
  
  try {
    logger.info('验证更新结果...');
    
    connection = await mysql.createConnection(config.database);
    
    // 检查字段
    for (const field of newFields) {
      const exists = await checkFieldExists(connection, field.table, field.field);
      if (exists) {
        logger.info(`✅ 字段 ${field.table}.${field.field} 存在`);
      } else {
        logger.error(`❌ 字段 ${field.table}.${field.field} 不存在`);
        return false;
      }
    }
    
    // 检查索引
    for (const index of newIndexes) {
      const exists = await checkIndexExists(connection, index.table, index.name);
      if (exists) {
        logger.info(`✅ 索引 ${index.table}.${index.name} 存在`);
      } else {
        logger.error(`❌ 索引 ${index.table}.${index.name} 不存在`);
        return false;
      }
    }
    
    logger.info('✅ 所有更新验证通过！');
    return true;
    
  } catch (error) {
    logger.error('验证更新结果失败:', error);
    return false;
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
  const command = process.argv[2];
  
  switch (command) {
    case 'update':
      const success = await updateDatabase();
      if (success) {
        await verifyUpdate();
      }
      break;
      
    case 'verify':
      await verifyUpdate();
      break;
      
    default:
      console.log('使用方法:');
      console.log('  node scripts/updateDatabase.js update  - 更新数据库');
      console.log('  node scripts/updateDatabase.js verify - 验证更新结果');
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateDatabase,
  verifyUpdate
};

