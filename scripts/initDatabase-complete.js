const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

/**
 * 智慧物业管理系统 - 完整数据库初始化脚本
 * 包含所有必要的表结构、索引、示例数据和配置
 */

// 数据库表创建SQL语句
const createTableSQLs = {
  // 1. 用户表
  users: `
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
      departmentId VARCHAR(36) COMMENT '部门ID',
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
      INDEX idx_department (department, departmentId),
      INDEX idx_role (role),
      INDEX idx_status (status),
      INDEX idx_test_users (isTestUser, isAdminTest, isSysAdminTest),
      INDEX idx_create_time (createTime),
      INDEX idx_last_login (lastLoginTime),
      FOREIGN KEY (departmentId) REFERENCES departments(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
  `,

  // 2. 部门表
  departments: `
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
      INDEX idx_status (status),
      FOREIGN KEY (parentId) REFERENCES departments(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表'
  `,

  // 3. 用户令牌表
  user_tokens: `
    CREATE TABLE IF NOT EXISTS user_tokens (
      _id VARCHAR(36) PRIMARY KEY COMMENT 'Token ID',
      userId VARCHAR(36) NOT NULL COMMENT '用户ID',
      openid VARCHAR(100) COMMENT '微信openid',
      phoneNumber VARCHAR(11) COMMENT '手机号',
      token TEXT NOT NULL COMMENT 'JWT Token',
      deviceInfo JSON COMMENT '设备信息',
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
  `,

  // 4. 验证码表
  verification_codes: `
    CREATE TABLE IF NOT EXISTS verification_codes (
      _id VARCHAR(36) PRIMARY KEY COMMENT '验证码ID',
      phoneNumber VARCHAR(11) NOT NULL COMMENT '手机号',
      code VARCHAR(6) NOT NULL COMMENT '验证码',
      type ENUM('login', 'register', 'reset') DEFAULT 'login' COMMENT '验证码类型',
      status ENUM('unused', 'used', 'expired') DEFAULT 'unused' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      expireTime TIMESTAMP NOT NULL COMMENT '过期时间',
      usedTime TIMESTAMP NULL COMMENT '使用时间',
      ipAddress VARCHAR(45) COMMENT '请求IP地址',
      
      INDEX idx_phone_code (phoneNumber, code),
      INDEX idx_phone_type (phoneNumber, type),
      INDEX idx_expire_time (expireTime),
      INDEX idx_status (status),
      INDEX idx_create_time (createTime)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证码表'
  `,

  // 5. 菜单表
  menus: `
    CREATE TABLE IF NOT EXISTS menus (
      _id VARCHAR(36) PRIMARY KEY COMMENT '菜单ID',
      publishDate DATE NOT NULL COMMENT '发布日期',
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL COMMENT '餐次类型',
      mealTime VARCHAR(50) COMMENT '用餐时间',
      publishStatus ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '发布状态',
      publisherId VARCHAR(36) COMMENT '发布人ID',
      dishes JSON COMMENT '菜品信息',
      nutritionInfo JSON COMMENT '营养信息',
      price DECIMAL(10,2) DEFAULT 0 COMMENT '价格',
      capacity INT DEFAULT 0 COMMENT '容量限制',
      currentOrders INT DEFAULT 0 COMMENT '当前订餐数量',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      UNIQUE KEY uk_date_meal (publishDate, mealType),
      INDEX idx_publish_date (publishDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_status (publishStatus),
      INDEX idx_publisher (publisherId),
      INDEX idx_capacity (capacity, currentOrders),
      FOREIGN KEY (publisherId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表'
  `,

  // 6. 日常报餐记录表
  dining_orders: `
    CREATE TABLE IF NOT EXISTS dining_orders (
      _id VARCHAR(36) PRIMARY KEY COMMENT '订单ID',
      menuId VARCHAR(36) COMMENT '菜单ID',
      deptId VARCHAR(36) COMMENT '部门ID',
      deptName VARCHAR(100) COMMENT '部门名称',
      registrantId VARCHAR(36) NOT NULL COMMENT '登记人ID',
      registrantName VARCHAR(100) NOT NULL COMMENT '登记人姓名',
      memberIds JSON NOT NULL COMMENT '成员ID列表',
      memberNames JSON NOT NULL COMMENT '成员姓名列表',
      memberCount INT NOT NULL COMMENT '成员数量',
      diningDate DATE NOT NULL COMMENT '用餐日期',
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL COMMENT '餐次类型',
      status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
      totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总金额',
      remark TEXT COMMENT '备注',
      confirmTime TIMESTAMP NULL COMMENT '确认时间',
      confirmedBy VARCHAR(36) COMMENT '确认人ID',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_menu (menuId),
      INDEX idx_registrant (registrantId),
      INDEX idx_dining_date (diningDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_status (status),
      INDEX idx_dept (deptId),
      INDEX idx_confirm_time (confirmTime),
      INDEX idx_create_time (createTime),
      FOREIGN KEY (menuId) REFERENCES menus(_id) ON DELETE SET NULL,
      FOREIGN KEY (registrantId) REFERENCES users(_id) ON DELETE CASCADE,
      FOREIGN KEY (deptId) REFERENCES departments(_id) ON DELETE SET NULL,
      FOREIGN KEY (confirmedBy) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日常报餐记录表'
  `,

  // 7. 特殊预约表
  special_reservations: `
    CREATE TABLE IF NOT EXISTS special_reservations (
      _id VARCHAR(36) PRIMARY KEY COMMENT '预约ID',
      applicantId VARCHAR(36) COMMENT '申请人ID',
      name VARCHAR(50) NOT NULL COMMENT '姓名',
      phone VARCHAR(11) NOT NULL COMMENT '手机号',
      department VARCHAR(100) NOT NULL COMMENT '部门',
      departmentId VARCHAR(36) COMMENT '部门ID',
      date DATE NOT NULL COMMENT '预约日期',
      mealTime VARCHAR(50) NOT NULL COMMENT '用餐时间',
      peopleCount INT NOT NULL COMMENT '用餐人数',
      specialRequirements TEXT COMMENT '特殊要求',
      selectedDishes JSON COMMENT '选择的菜品',
      totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总金额',
      status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
      auditComment TEXT COMMENT '审核意见',
      auditorId VARCHAR(36) COMMENT '审核人ID',
      auditTime TIMESTAMP NULL COMMENT '审核时间',
      submitTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      isSpecialReservation BOOLEAN DEFAULT TRUE COMMENT '是否为特殊预约',
      
      INDEX idx_applicant (applicantId),
      INDEX idx_name (name),
      INDEX idx_phone (phone),
      INDEX idx_date (date),
      INDEX idx_status (status),
      INDEX idx_department (department, departmentId),
      INDEX idx_auditor (auditorId),
      INDEX idx_audit_time (auditTime),
      INDEX idx_submit_time (submitTime),
      FOREIGN KEY (applicantId) REFERENCES users(_id) ON DELETE SET NULL,
      FOREIGN KEY (departmentId) REFERENCES departments(_id) ON DELETE SET NULL,
      FOREIGN KEY (auditorId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='特殊预约表'
  `,

  // 8. 场地表
  venues: `
    CREATE TABLE IF NOT EXISTS venues (
      _id VARCHAR(36) PRIMARY KEY COMMENT '场地ID',
      name VARCHAR(100) NOT NULL COMMENT '场地名称',
      code VARCHAR(20) UNIQUE COMMENT '场地编码',
      type ENUM('badminton', 'pingpong', 'basketball', 'meeting', 'other') NOT NULL COMMENT '场地类型',
      capacity INT NOT NULL DEFAULT 4 COMMENT '容量',
      location VARCHAR(200) COMMENT '位置',
      price DECIMAL(10,2) DEFAULT 0 COMMENT '价格',
      description TEXT COMMENT '描述',
      facilities JSON COMMENT '设施信息',
      openTime TIME DEFAULT '08:00:00' COMMENT '开放时间',
      closeTime TIME DEFAULT '22:00:00' COMMENT '关闭时间',
      status ENUM('open', 'closed', 'maintenance') DEFAULT 'open' COMMENT '状态',
      managerId VARCHAR(36) COMMENT '管理员ID',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_name (name),
      INDEX idx_code (code),
      INDEX idx_type (type),
      INDEX idx_status (status),
      INDEX idx_capacity (capacity),
      INDEX idx_manager (managerId),
      FOREIGN KEY (managerId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地表'
  `,

  // 9. 场地预约表
  reservations: `
    CREATE TABLE IF NOT EXISTS reservations (
      _id VARCHAR(36) PRIMARY KEY COMMENT '预约ID',
      venueId VARCHAR(36) NOT NULL COMMENT '场地ID',
      venueName VARCHAR(100) NOT NULL COMMENT '场地名称',
      userId VARCHAR(36) NOT NULL COMMENT '用户ID',
      reservationDate DATE NOT NULL COMMENT '预约日期',
      startTime TIME NOT NULL COMMENT '开始时间',
      endTime TIME NOT NULL COMMENT '结束时间',
      duration INT COMMENT '时长(分钟)',
      userName VARCHAR(50) NOT NULL COMMENT '用户姓名',
      phoneNumber VARCHAR(11) NOT NULL COMMENT '手机号',
      department VARCHAR(100) COMMENT '部门',
      purpose VARCHAR(200) NOT NULL COMMENT '使用目的',
      participants JSON COMMENT '参与人员',
      participantCount INT DEFAULT 1 COMMENT '参与人数',
      remark TEXT COMMENT '备注',
      totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总金额',
      status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
      approvedBy VARCHAR(36) COMMENT '批准人ID',
      approveTime TIMESTAMP NULL COMMENT '批准时间',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_venue (venueId),
      INDEX idx_user (userId),
      INDEX idx_date (reservationDate),
      INDEX idx_time_range (reservationDate, startTime, endTime),
      INDEX idx_status (status),
      INDEX idx_approver (approvedBy),
      INDEX idx_create_time (createTime),
      UNIQUE KEY uk_venue_time (venueId, reservationDate, startTime, endTime),
      FOREIGN KEY (venueId) REFERENCES venues(_id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
      FOREIGN KEY (approvedBy) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地预约表'
  `,

  // 10. 餐桌表
  dining_tables: `
    CREATE TABLE IF NOT EXISTS dining_tables (
      _id VARCHAR(36) PRIMARY KEY COMMENT '餐桌ID',
      tableName VARCHAR(50) NOT NULL COMMENT '餐桌名称',
      tableNumber VARCHAR(20) UNIQUE COMMENT '餐桌编号',
      location VARCHAR(100) COMMENT '位置',
      maxCapacity INT NOT NULL DEFAULT 6 COMMENT '最大容量',
      currentPeople INT DEFAULT 0 COMMENT '当前人数',
      qrCode VARCHAR(100) UNIQUE COMMENT '二维码',
      verificationCode VARCHAR(10) UNIQUE COMMENT '验证码',
      status ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available' COMMENT '状态',
      lastVerificationTime TIMESTAMP NULL COMMENT '最后验证时间',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_table_name (tableName),
      INDEX idx_table_number (tableNumber),
      INDEX idx_location (location),
      INDEX idx_capacity (maxCapacity, currentPeople),
      INDEX idx_qr_code (qrCode),
      INDEX idx_verification_code (verificationCode),
      INDEX idx_status (status),
      INDEX idx_last_verification (lastVerificationTime)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='餐桌表'
  `,

  // 11. 用餐验证记录表
  dining_verifications: `
    CREATE TABLE IF NOT EXISTS dining_verifications (
      _id VARCHAR(36) PRIMARY KEY COMMENT '验证ID',
      userId VARCHAR(36) NOT NULL COMMENT '用户ID',
      userName VARCHAR(50) NOT NULL COMMENT '用户姓名',
      tableId VARCHAR(36) NOT NULL COMMENT '餐桌ID',
      tableName VARCHAR(50) NOT NULL COMMENT '餐桌名称',
      orderId VARCHAR(36) COMMENT '订单ID',
      verificationMethod ENUM('qr_code', 'verification_code', 'manual') NOT NULL COMMENT '验证方式',
      verificationData VARCHAR(100) COMMENT '验证数据',
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL COMMENT '餐次类型',
      diningDate DATE NOT NULL COMMENT '用餐日期',
      verificationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '验证时间',
      verifierId VARCHAR(36) COMMENT '验证员ID',
      verifierName VARCHAR(50) COMMENT '验证员姓名',
      status ENUM('success', 'failed') DEFAULT 'success' COMMENT '验证状态',
      remark TEXT COMMENT '备注',
      
      INDEX idx_user (userId),
      INDEX idx_table (tableId),
      INDEX idx_order (orderId),
      INDEX idx_dining_date (diningDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_verification_time (verificationTime),
      INDEX idx_verifier (verifierId),
      INDEX idx_status (status),
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
      FOREIGN KEY (tableId) REFERENCES dining_tables(_id) ON DELETE CASCADE,
      FOREIGN KEY (orderId) REFERENCES dining_orders(_id) ON DELETE SET NULL,
      FOREIGN KEY (verifierId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用餐验证记录表'
  `,

  // 12. 系统公告表
  system_announcements: `
    CREATE TABLE IF NOT EXISTS system_announcements (
      _id VARCHAR(36) PRIMARY KEY COMMENT '公告ID',
      title VARCHAR(200) NOT NULL COMMENT '标题',
      content TEXT NOT NULL COMMENT '内容',
      type ENUM('system', 'maintenance', 'event', 'notice') DEFAULT 'notice' COMMENT '公告类型',
      priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
      targetAudience ENUM('all', 'users', 'admins', 'dept_admins') DEFAULT 'all' COMMENT '目标受众',
      publisherId VARCHAR(36) NOT NULL COMMENT '发布人ID',
      publisherName VARCHAR(50) NOT NULL COMMENT '发布人姓名',
      status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
      publishTime TIMESTAMP NULL COMMENT '发布时间',
      expireTime TIMESTAMP NULL COMMENT '过期时间',
      readCount INT DEFAULT 0 COMMENT '阅读次数',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_type (type),
      INDEX idx_priority (priority),
      INDEX idx_publisher (publisherId),
      INDEX idx_status (status),
      INDEX idx_publish_time (publishTime),
      INDEX idx_expire_time (expireTime),
      INDEX idx_create_time (createTime),
      FOREIGN KEY (publisherId) REFERENCES users(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表'
  `,

  // 13. 活动日志表
  activity_logs: `
    CREATE TABLE IF NOT EXISTS activity_logs (
      _id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
      userId VARCHAR(36) COMMENT '用户ID',
      userName VARCHAR(50) COMMENT '用户姓名',
      action VARCHAR(100) NOT NULL COMMENT '操作',
      module VARCHAR(50) NOT NULL COMMENT '模块',
      resourceType VARCHAR(50) COMMENT '资源类型',
      resourceId VARCHAR(36) COMMENT '资源ID',
      details JSON COMMENT '详细信息',
      ipAddress VARCHAR(45) COMMENT 'IP地址',
      userAgent TEXT COMMENT 'User Agent',
      status ENUM('success', 'failed') DEFAULT 'success' COMMENT '状态',
      errorMessage TEXT COMMENT '错误信息',
      duration INT COMMENT '执行时长(毫秒)',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      INDEX idx_user (userId),
      INDEX idx_action (action),
      INDEX idx_module (module),
      INDEX idx_resource (resourceType, resourceId),
      INDEX idx_status (status),
      INDEX idx_create_time (createTime),
      INDEX idx_ip_address (ipAddress),
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动日志表'
  `,

  // 14. 文件上传表
  file_uploads: `
    CREATE TABLE IF NOT EXISTS file_uploads (
      _id VARCHAR(36) PRIMARY KEY COMMENT '文件ID',
      fileName VARCHAR(255) NOT NULL COMMENT '文件名',
      originalName VARCHAR(255) NOT NULL COMMENT '原始文件名',
      filePath VARCHAR(500) NOT NULL COMMENT '文件路径',
      fileSize BIGINT NOT NULL COMMENT '文件大小(字节)',
      mimeType VARCHAR(100) NOT NULL COMMENT 'MIME类型',
      fileHash VARCHAR(64) COMMENT '文件哈希',
      uploaderId VARCHAR(36) NOT NULL COMMENT '上传者ID',
      uploaderName VARCHAR(50) NOT NULL COMMENT '上传者姓名',
      category ENUM('avatar', 'document', 'image', 'other') DEFAULT 'other' COMMENT '文件分类',
      status ENUM('uploading', 'completed', 'failed', 'deleted') DEFAULT 'completed' COMMENT '状态',
      downloadCount INT DEFAULT 0 COMMENT '下载次数',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_uploader (uploaderId),
      INDEX idx_category (category),
      INDEX idx_status (status),
      INDEX idx_file_hash (fileHash),
      INDEX idx_create_time (createTime),
      FOREIGN KEY (uploaderId) REFERENCES users(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件上传表'
  `,

  // 15. 系统配置表
  system_configs: `
    CREATE TABLE IF NOT EXISTS system_configs (
      _id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
      configKey VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
      configValue TEXT COMMENT '配置值',
      dataType ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '数据类型',
      category VARCHAR(50) DEFAULT 'general' COMMENT '配置分类',
      description TEXT COMMENT '配置描述',
      isPublic BOOLEAN DEFAULT FALSE COMMENT '是否公开',
      isEditable BOOLEAN DEFAULT TRUE COMMENT '是否可编辑',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_config_key (configKey),
      INDEX idx_category (category),
      INDEX idx_is_public (isPublic),
      INDEX idx_is_editable (isEditable)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表'
  `
};

// 示例数据
const sampleData = {
  // 部门数据
  departments: [
    {
      _id: uuidv4(),
      name: '技术部',
      code: 'TECH',
      level: 1,
      description: '技术开发部门'
    },
    {
      _id: uuidv4(),
      name: '人事部',
      code: 'HR',
      level: 1,
      description: '人力资源部门'
    },
    {
      _id: uuidv4(),
      name: '财务部',
      code: 'FINANCE',
      level: 1,
      description: '财务管理部门'
    }
  ],

  // 场地数据
  venues: [
    {
      _id: uuidv4(),
      name: '羽毛球场A',
      code: 'BD001',
      type: 'badminton',
      capacity: 4,
      location: 'A区1楼',
      price: 50.00,
      description: '标准羽毛球场地',
      facilities: JSON.stringify(['灯光', '空调', '更衣室'])
    },
    {
      _id: uuidv4(),
      name: '乒乓球台1号',
      code: 'TT001',
      type: 'pingpong',
      capacity: 4,
      location: 'B区2楼',
      price: 20.00,
      description: '标准乒乓球台',
      facilities: JSON.stringify(['球拍', '乒乓球'])
    },
    {
      _id: uuidv4(),
      name: '篮球场',
      code: 'BB001',
      type: 'basketball',
      capacity: 10,
      location: '室外运动场',
      price: 100.00,
      description: '标准篮球场地',
      facilities: JSON.stringify(['篮球', '计分板'])
    }
  ],

  // 餐桌数据
  dining_tables: [
    {
      _id: uuidv4(),
      tableName: 'A区01号桌',
      tableNumber: 'A001',
      location: 'A区',
      maxCapacity: 6,
      qrCode: 'TABLE_A001_QR',
      verificationCode: 'A001V'
    },
    {
      _id: uuidv4(),
      tableName: 'A区02号桌',
      tableNumber: 'A002',
      location: 'A区',
      maxCapacity: 6,
      qrCode: 'TABLE_A002_QR',
      verificationCode: 'A002V'
    },
    {
      _id: uuidv4(),
      tableName: 'B区01号桌',
      tableNumber: 'B001',
      location: 'B区',
      maxCapacity: 8,
      qrCode: 'TABLE_B001_QR',
      verificationCode: 'B001V'
    }
  ],

  // 系统配置数据
  system_configs: [
    {
      _id: uuidv4(),
      configKey: 'system.name',
      configValue: '智慧物业管理系统',
      dataType: 'string',
      category: 'system',
      description: '系统名称',
      isPublic: true
    },
    {
      _id: uuidv4(),
      configKey: 'dining.advance_days',
      configValue: '7',
      dataType: 'number',
      category: 'dining',
      description: '报餐提前天数',
      isPublic: true
    },
    {
      _id: uuidv4(),
      configKey: 'reservation.max_duration',
      configValue: '240',
      dataType: 'number',
      category: 'reservation',
      description: '场地预约最大时长(分钟)',
      isPublic: true
    },
    {
      _id: uuidv4(),
      configKey: 'verification.qr_expire_time',
      configValue: '300',
      dataType: 'number',
      category: 'verification',
      description: '二维码过期时间(秒)',
      isPublic: false
    }
  ]
};

/**
 * 创建数据库
 */
async function createDatabase() {
  let connection;
  
  try {
    logger.info('开始创建数据库...');
    
    // 连接MySQL（不指定数据库）
    const { database, ...connectionConfig } = config.database;
    connection = await mysql.createConnection(connectionConfig);
    
    // 创建数据库 - 使用query而不是execute
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    logger.info(`数据库 ${database} 创建成功`);
    
    // 关闭当前连接
    await connection.end();
    
    // 重新连接到指定数据库
    connection = await mysql.createConnection(config.database);
    logger.info('连接到数据库成功');
    
    return connection;
  } catch (error) {
    logger.error('创建数据库失败:', error);
    if (connection) await connection.end();
    throw error;
  }
}

/**
 * 创建表结构
 */
async function createTables(connection) {
  try {
    logger.info('开始创建表结构...');
    
    // 禁用外键检查，避免循环依赖问题
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // 按依赖顺序创建表
    const tableOrder = [
      'system_configs',   // 系统配置表(无依赖)
      'verification_codes', // 验证码表(无依赖)  
      'dining_tables',   // 餐桌表(无依赖)
      'departments',     // 部门表(无依赖)
      'users',           // 用户表(依赖部门表，但departmentId可为空)
      'user_tokens',     // 用户令牌表(依赖用户表)
      'menus',           // 菜单表(依赖用户表)
      'dining_orders',   // 报餐记录表(依赖菜单表、用户表、部门表)
      'special_reservations', // 特殊预约表(依赖用户表、部门表)
      'venues',          // 场地表(依赖用户表)
      'reservations',    // 场地预约表(依赖场地表、用户表)
      'dining_verifications', // 用餐验证记录表(依赖用户表、餐桌表、报餐记录表)
      'system_announcements', // 系统公告表(依赖用户表)
      'activity_logs',   // 活动日志表(依赖用户表)
      'file_uploads'     // 文件上传表(依赖用户表)
    ];
    
    for (const tableName of tableOrder) {
      if (createTableSQLs[tableName]) {
        await connection.query(createTableSQLs[tableName]);
        logger.info(`表 ${tableName} 创建成功`);
      }
    }
    
    // 重新启用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    logger.info('所有表创建完成');
  } catch (error) {
    logger.error('创建表失败:', error);
    throw error;
  }
}

/**
 * 插入示例数据
 */
async function insertSampleData(connection) {
  try {
    logger.info('开始插入示例数据...');
    
    // 插入部门数据
    for (const dept of sampleData.departments) {
      await connection.query(
        `INSERT IGNORE INTO departments (_id, name, code, level, description, status, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [dept._id, dept.name, dept.code, dept.level, dept.description]
      );
    }
    logger.info('部门示例数据插入完成');
    
    // 插入场地数据
    for (const venue of sampleData.venues) {
      await connection.query(
        `INSERT IGNORE INTO venues (_id, name, code, type, capacity, location, price, description, facilities, status, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW(), NOW())`,
        [venue._id, venue.name, venue.code, venue.type, venue.capacity, venue.location, venue.price, venue.description, venue.facilities]
      );
    }
    logger.info('场地示例数据插入完成');
    
    // 插入餐桌数据
    for (const table of sampleData.dining_tables) {
      await connection.query(
        `INSERT IGNORE INTO dining_tables (_id, tableName, tableNumber, location, maxCapacity, qrCode, verificationCode, status, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'available', NOW(), NOW())`,
        [table._id, table.tableName, table.tableNumber, table.location, table.maxCapacity, table.qrCode, table.verificationCode]
      );
    }
    logger.info('餐桌示例数据插入完成');
    
    // 插入系统配置数据
    for (const config of sampleData.system_configs) {
      await connection.query(
        `INSERT IGNORE INTO system_configs (_id, configKey, configValue, dataType, category, description, isPublic, isEditable, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [config._id, config.configKey, config.configValue, config.dataType, config.category, config.description, config.isPublic, true]
      );
    }
    logger.info('系统配置示例数据插入完成');
    
    logger.info('所有示例数据插入完成');
  } catch (error) {
    logger.error('插入示例数据失败:', error);
    throw error;
  }
}

/**
 * 验证数据库结构
 */
async function verifyDatabase(connection) {
  try {
    logger.info('开始验证数据库结构...');
    
    // 检查所有表是否存在
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const expectedTables = Object.keys(createTableSQLs);
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      logger.error('缺少以下表:', missingTables);
      return false;
    }
    
    logger.info('✅ 所有表存在');
    
    // 检查示例数据
    const [deptCount] = await connection.query('SELECT COUNT(*) as count FROM departments');
    const [venueCount] = await connection.query('SELECT COUNT(*) as count FROM venues');
    const [tableCount] = await connection.query('SELECT COUNT(*) as count FROM dining_tables');
    const [configCount] = await connection.query('SELECT COUNT(*) as count FROM system_configs');
    
    logger.info(`✅ 示例数据统计:`);
    logger.info(`   - 部门: ${deptCount[0].count} 条`);
    logger.info(`   - 场地: ${venueCount[0].count} 条`);
    logger.info(`   - 餐桌: ${tableCount[0].count} 条`);
    logger.info(`   - 配置: ${configCount[0].count} 条`);
    
    logger.info('✅ 数据库验证完成');
    return true;
  } catch (error) {
    logger.error('验证数据库失败:', error);
    return false;
  }
}

/**
 * 清理数据库
 */
async function cleanDatabase(connection) {
  try {
    logger.info('开始清理数据库...');
    
    // 按依赖关系逆序删除表
    const tableOrder = [
      'activity_logs',
      'dining_verifications',
      'reservations',
      'special_reservations',
      'dining_orders',
      'file_uploads',
      'system_announcements',
      'user_tokens',
      'verification_codes',
      'menus',
      'venues',
      'dining_tables',
      'system_configs',
      'users',
      'departments'
    ];
    
    // 禁用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const tableName of tableOrder) {
      await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
      logger.info(`表 ${tableName} 删除成功`);
    }
    
    // 启用外键检查
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    logger.info('数据库清理完成');
  } catch (error) {
    logger.error('清理数据库失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  let connection;
  
  try {
    switch (command) {
      case 'init':
        connection = await createDatabase();
        await createTables(connection);
        await insertSampleData(connection);
        await verifyDatabase(connection);
        logger.info('🎉 数据库初始化完成！');
        break;
        
      case 'reset':
        logger.warn('⚠️  即将重置数据库，所有数据将被删除！');
        connection = await mysql.createConnection(config.database);
        await cleanDatabase(connection);
        await createTables(connection);
        await insertSampleData(connection);
        await verifyDatabase(connection);
        logger.info('🎉 数据库重置完成！');
        break;
        
      case 'verify':
        connection = await mysql.createConnection(config.database);
        const isValid = await verifyDatabase(connection);
        process.exit(isValid ? 0 : 1);
        break;
        
      case 'clean':
        logger.warn('⚠️  即将清理数据库，所有数据将被删除！');
        connection = await mysql.createConnection(config.database);
        await cleanDatabase(connection);
        logger.info('🧹 数据库清理完成！');
        break;
        
      default:
        console.log('智慧物业管理系统 - 数据库初始化脚本');
        console.log('');
        console.log('使用方法:');
        console.log('  node scripts/initDatabase-complete.js init    - 初始化数据库（创建数据库、表和示例数据）');
        console.log('  node scripts/initDatabase-complete.js reset   - 重置数据库（删除所有数据后重新初始化）');
        console.log('  node scripts/initDatabase-complete.js verify  - 验证数据库结构');
        console.log('  node scripts/initDatabase-complete.js clean   - 清理数据库（删除所有表）');
        console.log('');
        console.log('注意: reset 和 clean 操作会删除所有数据，请谨慎使用！');
        break;
    }
  } catch (error) {
    logger.error('操作失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createDatabase,
  createTables,
  insertSampleData,
  verifyDatabase,
  cleanDatabase
};
