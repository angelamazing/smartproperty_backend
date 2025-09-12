const mysql = require('mysql2/promise');
const config = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// 提取数据库配置
const dbConfig = config.database;

/**
 * 部门管理系统初始化脚本
 * 创建9个部门的基础数据和部门管理员用户
 */

// 9个部门的基础数据
const departments = [
  {
    name: '地质数据中心',
    code: 'GEO_DATA',
    description: '负责地质数据的收集、整理、分析和应用'
  },
  {
    name: '地质工程中心',
    code: 'GEO_ENG',
    description: '负责地质工程项目的规划、设计和实施'
  },
  {
    name: '生态环境中心',
    code: 'ECO_ENV',
    description: '负责生态环境监测、评估和保护工作'
  },
  {
    name: '地质环境中心',
    code: 'GEO_ENV',
    description: '负责地质环境调查、评价和治理'
  },
  {
    name: '地质调查中心',
    code: 'GEO_SURVEY',
    description: '负责地质调查、勘探和资源评价'
  },
  {
    name: '黄梅分站',
    code: 'HUANGMEI',
    description: '黄梅地区分站，负责区域地质工作'
  },
  {
    name: '矿业有限责任公司',
    code: 'MINING_CO',
    description: '负责矿业开发、生产和经营管理'
  },
  {
    name: '物业中心',
    code: 'PROPERTY',
    description: '负责物业管理、维护和服务工作'
  },
  {
    name: '机关科室',
    code: 'ADMIN',
    description: '负责行政管理、人事财务等机关工作'
  }
];

// 部门管理员用户数据
const departmentAdmins = [
  {
    nickName: '地质数据中心管理员',
    realName: '张数据',
    phoneNumber: '13800001001',
    email: 'zhangdata@example.com',
    department: '地质数据中心',
    position: '部门管理员',
    employeeId: 'EMP001',
    role: 'dept_admin'
  },
  {
    nickName: '地质工程中心管理员',
    realName: '李工程',
    phoneNumber: '13800001002',
    email: 'ligongcheng@example.com',
    department: '地质工程中心',
    position: '部门管理员',
    employeeId: 'EMP002',
    role: 'dept_admin'
  },
  {
    nickName: '生态环境中心管理员',
    realName: '王生态',
    phoneNumber: '13800001003',
    email: 'wangshengtai@example.com',
    department: '生态环境中心',
    position: '部门管理员',
    employeeId: 'EMP003',
    role: 'dept_admin'
  },
  {
    nickName: '地质环境中心管理员',
    realName: '赵环境',
    phoneNumber: '13800001004',
    email: 'zhaohuanjing@example.com',
    department: '地质环境中心',
    position: '部门管理员',
    employeeId: 'EMP004',
    role: 'dept_admin'
  },
  {
    nickName: '地质调查中心管理员',
    realName: '刘调查',
    phoneNumber: '13800001005',
    email: 'liudiaocha@example.com',
    department: '地质调查中心',
    position: '部门管理员',
    employeeId: 'EMP005',
    role: 'dept_admin'
  },
  {
    nickName: '黄梅分站管理员',
    realName: '陈黄梅',
    phoneNumber: '13800001006',
    email: 'chenhuangmei@example.com',
    department: '黄梅分站',
    position: '部门管理员',
    employeeId: 'EMP006',
    role: 'dept_admin'
  },
  {
    nickName: '矿业公司管理员',
    realName: '孙矿业',
    phoneNumber: '13800001007',
    email: 'sunkuangye@example.com',
    department: '矿业有限责任公司',
    position: '部门管理员',
    employeeId: 'EMP007',
    role: 'dept_admin'
  },
  {
    nickName: '物业中心管理员',
    realName: '周物业',
    phoneNumber: '13800001008',
    email: 'zhouwuye@example.com',
    department: '物业中心',
    position: '部门管理员',
    employeeId: 'EMP008',
    role: 'dept_admin'
  },
  {
    nickName: '机关科室管理员',
    realName: '吴机关',
    phoneNumber: '13800001009',
    email: 'wujiguan@example.com',
    department: '机关科室',
    position: '部门管理员',
    employeeId: 'EMP009',
    role: 'dept_admin'
  }
];

/**
 * 初始化部门数据
 */
async function initDepartments() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始初始化部门数据...');

    // 检查部门表是否存在
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        _id VARCHAR(36) PRIMARY KEY COMMENT '部门ID',
        name VARCHAR(100) NOT NULL COMMENT '部门名称',
        code VARCHAR(20) UNIQUE COMMENT '部门编码',
        parentId VARCHAR(36) COMMENT '父级部门ID',
        level INT DEFAULT 1 COMMENT '部门层级',
        description TEXT COMMENT '部门描述',
        managerId VARCHAR(36) COMMENT '部门负责人ID',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        INDEX idx_name (name),
        INDEX idx_code (code),
        INDEX idx_parent (parentId),
        INDEX idx_level (level),
        INDEX idx_manager (managerId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表'
    `);

    // 插入部门数据
    for (const dept of departments) {
      const deptId = uuidv4();
      
      // 检查部门是否已存在
      const [existing] = await connection.execute(
        'SELECT _id FROM departments WHERE code = ?',
        [dept.code]
      );
      
      if (existing.length === 0) {
        await connection.execute(`
          INSERT INTO departments (_id, name, code, description, status, createTime, updateTime)
          VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
        `, [deptId, dept.name, dept.code, dept.description]);
        
        logger.info(`创建部门: ${dept.name} (${dept.code})`);
      } else {
        logger.info(`部门已存在: ${dept.name} (${dept.code})`);
      }
    }

    logger.info('部门数据初始化完成');
  } catch (error) {
    logger.error('初始化部门数据失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 创建部门管理员用户
 */
async function createDepartmentAdmins() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始创建部门管理员用户...');

    // 检查用户表是否存在
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        _id VARCHAR(36) PRIMARY KEY COMMENT '用户ID',
        openid VARCHAR(100) UNIQUE COMMENT '微信openid',
        unionid VARCHAR(100) COMMENT '微信unionid',
        nickName VARCHAR(100) COMMENT '用户昵称',
        realName VARCHAR(50) COMMENT '真实姓名',
        avatarUrl TEXT COMMENT '头像URL',
        phoneNumber VARCHAR(11) UNIQUE COMMENT '手机号',
        email VARCHAR(100) COMMENT '邮箱',
        password VARCHAR(255) COMMENT '密码(加密)',
        gender TINYINT DEFAULT 0 COMMENT '性别: 0-未知,1-男,2-女',
        country VARCHAR(50) COMMENT '国家',
        province VARCHAR(50) COMMENT '省份',
        city VARCHAR(50) COMMENT '城市',
        language VARCHAR(20) DEFAULT 'zh_CN' COMMENT '语言',
        department VARCHAR(100) COMMENT '部门',
        departmentId VARCHAR(36) COMMENT '部门ID',
        position VARCHAR(100) COMMENT '职位',
        employeeId VARCHAR(20) COMMENT '员工编号',
        joinDate DATE COMMENT '入职日期',
        role ENUM('user', 'dept_admin', 'admin', 'sys_admin', 'verifier') DEFAULT 'user' COMMENT '角色',
        status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'active' COMMENT '状态',
        remark TEXT COMMENT '备注',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        lastLoginTime TIMESTAMP NULL COMMENT '最后登录时间',
        loginCount INT DEFAULT 0 COMMENT '登录次数',
        createBy VARCHAR(36) COMMENT '创建人',
        updateBy VARCHAR(36) COMMENT '更新人',
        isTestUser BOOLEAN DEFAULT FALSE COMMENT '是否为测试用户',
        
        INDEX idx_openid (openid),
        INDEX idx_unionid (unionid),
        INDEX idx_phone (phoneNumber),
        INDEX idx_email (email),
        INDEX idx_employee_id (employeeId),
        INDEX idx_department (department, departmentId),
        INDEX idx_role (role),
        INDEX idx_status (status),
        INDEX idx_create_time (createTime),
        INDEX idx_last_login (lastLoginTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `);

    // 创建部门管理员用户
    for (const admin of departmentAdmins) {
      // 检查用户是否已存在
      const [existing] = await connection.execute(
        'SELECT _id FROM users WHERE phoneNumber = ?',
        [admin.phoneNumber]
      );
      
      if (existing.length === 0) {
        // 获取部门ID
        const [deptRows] = await connection.execute(
          'SELECT _id FROM departments WHERE name = ?',
          [admin.department]
        );
        
        if (deptRows.length === 0) {
          logger.warn(`部门不存在: ${admin.department}`);
          continue;
        }
        
        const deptId = deptRows[0]._id;
        const userId = uuidv4();
        
        // 创建用户
        await connection.execute(`
          INSERT INTO users (
            _id, nickName, phoneNumber, email, department, departmentId,
            role, status, createTime, updateTime
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `, [
          userId, admin.nickName, admin.phoneNumber, admin.email,
          admin.department, deptId, admin.role
        ]);
        
        // 更新部门表的managerId
        await connection.execute(
          'UPDATE departments SET managerId = ? WHERE _id = ?',
          [userId, deptId]
        );
        
        logger.info(`创建部门管理员: ${admin.nickName} (${admin.department})`);
      } else {
        logger.info(`用户已存在: ${admin.nickName} (${admin.phoneNumber})`);
      }
    }

    logger.info('部门管理员用户创建完成');
  } catch (error) {
    logger.error('创建部门管理员用户失败:', error);
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
    logger.info('开始初始化部门管理系统...');
    
    // 1. 初始化部门数据
    await initDepartments();
    
    // 2. 创建部门管理员用户
    await createDepartmentAdmins();
    
    logger.info('部门管理系统初始化完成！');
    
    // 输出总结信息
    console.log('\n=== 部门管理系统初始化完成 ===');
    console.log('✅ 已创建9个部门');
    console.log('✅ 已创建9个部门管理员用户');
    console.log('\n部门列表:');
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name} (${dept.code})`);
    });
    
    console.log('\n部门管理员用户:');
    departmentAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.nickName} - ${admin.phoneNumber}`);
    });
    
    console.log('\n下一步:');
    console.log('1. 运行后端服务器: npm start');
    console.log('2. 使用部门管理员账号登录测试');
    console.log('3. 测试部门级别的报餐权限控制');
    
  } catch (error) {
    logger.error('部门管理系统初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  initDepartments,
  createDepartmentAdmins,
  departments,
  departmentAdmins
};
