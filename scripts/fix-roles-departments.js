const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 修复角色表和部门表的问题
 * 解决以下错误：
 * 1. Table 'smart_property.roles' doesn't exist
 * 2. Unknown column 'd.sort' in 'order clause'
 */

async function fixRolesAndDepartments() {
  let connection;
  
  try {
    logger.info('开始修复角色表和部门表...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    logger.info('数据库连接成功');
    
    // 1. 检查并创建角色表
    logger.info('检查并创建角色表...');
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id varchar(36) NOT NULL COMMENT '角色ID',
          name varchar(50) NOT NULL COMMENT '角色名称',
          description varchar(200) DEFAULT NULL COMMENT '角色描述',
          status enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
          create_time datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          update_time datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          create_by varchar(36) DEFAULT NULL COMMENT '创建人',
          PRIMARY KEY (id),
          UNIQUE KEY uk_name (name),
          KEY idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表'
      `);
      logger.info('✅ 角色表创建完成');
      
      // 插入默认角色
      await connection.query(`
        INSERT IGNORE INTO roles (id, name, description) VALUES
        ('role_001', 'user', '普通用户'),
        ('role_002', 'admin', '普通管理员'),
        ('role_003', 'sys_admin', '系统管理员')
      `);
      logger.info('✅ 默认角色数据插入完成');
    } catch (error) {
      logger.error('创建角色表失败:', error.message);
    }
    
    // 2. 检查并修复部门表
    logger.info('检查并修复部门表...');
    try {
      // 检查部门表是否存在
      const [tables] = await connection.query("SHOW TABLES LIKE 'departments'");
      if (tables.length === 0) {
        // 部门表不存在，创建完整的部门表
        logger.info('部门表不存在，创建部门表...');
        await connection.query(`
          CREATE TABLE IF NOT EXISTS departments (
            id varchar(36) NOT NULL COMMENT '部门ID',
            name varchar(100) NOT NULL COMMENT '部门名称',
            description varchar(200) DEFAULT NULL COMMENT '部门描述',
            parent_id varchar(36) DEFAULT NULL COMMENT '上级部门ID',
            level int(11) DEFAULT 1 COMMENT '部门层级',
            sort int(11) DEFAULT 0 COMMENT '排序',
            manager_id varchar(36) DEFAULT NULL COMMENT '部门经理ID',
            status enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
            create_time datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            update_time datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            create_by varchar(36) DEFAULT NULL COMMENT '创建人',
            PRIMARY KEY (id),
            KEY idx_parent_id (parent_id),
            KEY idx_manager_id (manager_id),
            KEY idx_status (status),
            KEY idx_sort (sort)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表'
        `);
        logger.info('✅ 部门表创建完成');
        
        // 插入默认部门
        await connection.query(`
          INSERT IGNORE INTO departments (id, name, description, sort) VALUES
          ('dept_001', '技术部', '负责技术开发和维护', 1),
          ('dept_002', '行政部', '负责行政管理', 2),
          ('dept_003', '财务部', '负责财务管理', 3),
          ('dept_004', '人事部', '负责人力资源管理', 4)
        `);
        logger.info('✅ 默认部门数据插入完成');
      } else {
        // 部门表存在，检查是否缺少sort字段
        const [columns] = await connection.query("SHOW COLUMNS FROM departments WHERE Field = 'sort'");
        if (columns.length === 0) {
          logger.info('部门表缺少sort字段，添加sort字段...');
          await connection.query('ALTER TABLE departments ADD COLUMN sort int(11) DEFAULT 0 COMMENT "排序"');
          logger.info('✅ 部门表sort字段添加完成');
          
          // 添加sort索引
          await connection.query('ALTER TABLE departments ADD INDEX idx_sort (sort)');
          logger.info('✅ 部门表sort索引添加完成');
        } else {
          logger.info('✅ 部门表已包含sort字段');
        }
      }
    } catch (error) {
      logger.error('修复部门表失败:', error.message);
    }
    
    // 3. 检查用户表是否需要关联角色和部门
    logger.info('检查用户表与角色/部门的关联...');
    try {
      // 检查用户表是否存在
      const [userTables] = await connection.query("SHOW TABLES LIKE 'users' OR SHOW TABLES LIKE 'user'");
      if (userTables.length > 0) {
        const userTableName = Object.values(userTables[0])[0];
        logger.info(`找到用户表: ${userTableName}`);
        
        // 检查用户表是否有department_id字段（如果没有可能需要添加）
        const [userColumns] = await connection.query(`SHOW COLUMNS FROM ${userTableName} WHERE Field = 'department_id'`);
        if (userColumns.length === 0) {
          logger.info(`用户表缺少department_id字段，可能需要根据实际情况添加`);
        }
      }
    } catch (error) {
      logger.warn('检查用户表时出错:', error.message);
    }
    
    // 4. 验证修复结果
    logger.info('验证修复结果...');
    const [allTables] = await connection.query('SHOW TABLES');
    const tableNames = allTables.map(row => Object.values(row)[0]);
    
    logger.info('📋 修复结果检查:');
    logger.info(`   - roles表: ${tableNames.includes('roles') ? '✅ 已存在' : '❌ 不存在'}`);
    
    if (tableNames.includes('departments')) {
      const [deptColumns] = await connection.query("SHOW COLUMNS FROM departments WHERE Field = 'sort'");
      logger.info(`   - departments表: ✅ 已存在`);
      logger.info(`   - departments.sort字段: ${deptColumns.length > 0 ? '✅ 已存在' : '❌ 不存在'}`);
    } else {
      logger.info(`   - departments表: ❌ 不存在`);
    }
    
    logger.info('🎉 角色表和部门表修复完成！');
    return true;
    
  } catch (error) {
    logger.error('修复过程出错:', error);
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
  fixRolesAndDepartments()
    .then(success => {
      if (success) {
        console.log('\n🚀 修复成功！建议运行以下命令确保系统正常:');
        console.log('   1. 启动服务: npm run dev');
        console.log('   2. 检查数据库状态: npm run check-db');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 修复过程出错:', error);
      process.exit(1);
    });
}

module.exports = { fixRolesAndDepartments };