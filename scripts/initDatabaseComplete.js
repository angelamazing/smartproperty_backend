const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const bcrypt = require('bcryptjs');

/**
 * 企业餐饮预约管理系统 - 完整数据库初始化脚本
 * 包含原有基础表结构和新增管理员系统表结构
 * 版本: 2.0.0
 */

// 数据库表创建SQL语句
const createTableSQLs = {
  // ================================
  // 基础系统表
  // ================================
  
  // 1. 部门表 (基础表，无依赖)
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
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表'
  `,

  // 2. 用户表 (依赖部门表)
  users: `
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
      INDEX idx_last_login (lastLoginTime),
      FOREIGN KEY (departmentId) REFERENCES departments(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
  `,

  // 3. 角色表
  roles: `
    CREATE TABLE IF NOT EXISTS roles (
      _id VARCHAR(36) PRIMARY KEY COMMENT '角色ID',
      name VARCHAR(50) NOT NULL COMMENT '角色名称',
      description VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      createBy VARCHAR(36) DEFAULT NULL COMMENT '创建人',
      
      UNIQUE KEY uk_name (name),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表'
  `,

  // 4. 权限表
  permissions: `
    CREATE TABLE IF NOT EXISTS permissions (
      _id VARCHAR(36) PRIMARY KEY COMMENT '权限ID',
      name VARCHAR(50) NOT NULL COMMENT '权限名称',
      code VARCHAR(50) NOT NULL COMMENT '权限代码',
      description VARCHAR(200) DEFAULT NULL COMMENT '权限描述',
      category VARCHAR(20) DEFAULT NULL COMMENT '权限分类',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      UNIQUE KEY uk_code (code),
      INDEX idx_category (category),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表'
  `,

  // 5. 角色权限关联表
  role_permissions: `
    CREATE TABLE IF NOT EXISTS role_permissions (
      roleId VARCHAR(36) NOT NULL COMMENT '角色ID',
      permissionId VARCHAR(36) NOT NULL COMMENT '权限ID',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      PRIMARY KEY (roleId, permissionId),
      INDEX idx_permission_id (permissionId),
      FOREIGN KEY (roleId) REFERENCES roles(_id) ON DELETE CASCADE,
      FOREIGN KEY (permissionId) REFERENCES permissions(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表'
  `,

  // ================================
  // 菜品和菜单管理表
  // ================================

  // 6. 菜品分类表
  dish_categories: `
    CREATE TABLE IF NOT EXISTS dish_categories (
      _id VARCHAR(36) PRIMARY KEY COMMENT '分类ID',
      name VARCHAR(50) NOT NULL COMMENT '分类名称',
      description VARCHAR(200) DEFAULT NULL COMMENT '分类描述',
      icon VARCHAR(10) DEFAULT NULL COMMENT '图标',
      color VARCHAR(7) DEFAULT NULL COMMENT '颜色代码',
      sort INT DEFAULT 0 COMMENT '排序',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      createBy VARCHAR(36) DEFAULT NULL COMMENT '创建人',
      
      INDEX idx_status (status),
      INDEX idx_sort (sort)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜品分类表'
  `,

  // 7. 菜品表
  dishes: `
    CREATE TABLE IF NOT EXISTS dishes (
      _id VARCHAR(36) PRIMARY KEY COMMENT '菜品ID',
      name VARCHAR(100) NOT NULL COMMENT '菜品名称',
      categoryId VARCHAR(36) NOT NULL COMMENT '分类ID',
      description TEXT COMMENT '菜品描述',
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '价格',
      image VARCHAR(500) DEFAULT NULL COMMENT '图片URL',
      calories DECIMAL(8,2) DEFAULT NULL COMMENT '卡路里',
      protein DECIMAL(8,2) DEFAULT NULL COMMENT '蛋白质(g)',
      fat DECIMAL(8,2) DEFAULT NULL COMMENT '脂肪(g)',
      carbohydrate DECIMAL(8,2) DEFAULT NULL COMMENT '碳水化合物(g)',
      tags JSON COMMENT '标签',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      isRecommended BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      createBy VARCHAR(36) DEFAULT NULL COMMENT '创建人',
      
      INDEX idx_category_id (categoryId),
      INDEX idx_status (status),
      INDEX idx_is_recommended (isRecommended),
      FOREIGN KEY (categoryId) REFERENCES dish_categories(_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜品表'
  `,

  // 8. 菜单表
  menus: `
    CREATE TABLE IF NOT EXISTS menus (
      _id VARCHAR(36) PRIMARY KEY COMMENT '菜单ID',
      publishDate DATE NOT NULL COMMENT '发布日期',
      mealType ENUM('breakfast', 'lunch', 'dinner') NOT NULL COMMENT '餐次类型',
      mealTime VARCHAR(50) COMMENT '用餐时间',
      publishStatus ENUM('draft', 'published', 'archived', 'revoked') DEFAULT 'draft' COMMENT '发布状态',
      publisherId VARCHAR(36) COMMENT '发布人ID',
      dishes JSON COMMENT '菜品信息',
      nutritionInfo JSON COMMENT '营养信息',
      description TEXT COMMENT '菜单描述',
      price DECIMAL(10,2) DEFAULT 0 COMMENT '价格',
      capacity INT DEFAULT 0 COMMENT '容量限制',
      currentOrders INT DEFAULT 0 COMMENT '当前订餐数量',
      publishTime TIMESTAMP NULL COMMENT '发布时间',
      effectiveTime TIMESTAMP NULL COMMENT '生效时间',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      updateBy VARCHAR(36) COMMENT '更新人',
      
      UNIQUE KEY uk_date_meal (publishDate, mealType),
      INDEX idx_publish_date (publishDate),
      INDEX idx_meal_type (mealType),
      INDEX idx_status (publishStatus),
      INDEX idx_publisher (publisherId),
      INDEX idx_capacity (capacity, currentOrders),
      FOREIGN KEY (publisherId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表'
  `,

  // 9. 菜单菜品关联表
  menu_dishes: `
    CREATE TABLE IF NOT EXISTS menu_dishes (
      _id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
      menuId VARCHAR(36) NOT NULL COMMENT '菜单ID',
      dishId VARCHAR(36) NOT NULL COMMENT '菜品ID',
      price DECIMAL(10,2) DEFAULT 0.00 COMMENT '价格',
      sort INT DEFAULT 0 COMMENT '排序',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      INDEX idx_menu_id (menuId),
      INDEX idx_dish_id (dishId),
      FOREIGN KEY (menuId) REFERENCES menus(_id) ON DELETE CASCADE,
      FOREIGN KEY (dishId) REFERENCES dishes(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单菜品关联表'
  `,

  // 10. 菜单模板表
  menu_templates: `
    CREATE TABLE IF NOT EXISTS menu_templates (
      _id VARCHAR(36) PRIMARY KEY COMMENT '模板ID',
      name VARCHAR(100) NOT NULL COMMENT '模板名称',
      mealType ENUM('breakfast','lunch','dinner') NOT NULL COMMENT '餐次类型',
      description TEXT COMMENT '模板描述',
      dishes JSON COMMENT '菜品列表',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      createBy VARCHAR(36) DEFAULT NULL COMMENT '创建人',
      
      INDEX idx_meal_type (mealType),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单模板表'
  `,

  // 11. 营养模板表
  nutrition_templates: `
    CREATE TABLE IF NOT EXISTS nutrition_templates (
      _id VARCHAR(36) PRIMARY KEY COMMENT '模板ID',
      name VARCHAR(50) NOT NULL COMMENT '模板名称',
      type VARCHAR(20) NOT NULL COMMENT '模板类型',
      calories DECIMAL(8,2) DEFAULT NULL COMMENT '卡路里',
      protein DECIMAL(8,2) DEFAULT NULL COMMENT '蛋白质(g)',
      fat DECIMAL(8,2) DEFAULT NULL COMMENT '脂肪(g)',
      carbohydrate DECIMAL(8,2) DEFAULT NULL COMMENT '碳水化合物(g)',
      description TEXT COMMENT '模板描述',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_type (type),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='营养模板表'
  `,

  // ================================
  // 场地管理表
  // ================================

  // 12. 场地表
  venues: `
    CREATE TABLE IF NOT EXISTS venues (
      _id VARCHAR(36) PRIMARY KEY COMMENT '场地ID',
      name VARCHAR(100) NOT NULL COMMENT '场地名称',
      code VARCHAR(20) UNIQUE COMMENT '场地编码',
      type VARCHAR(50) NOT NULL COMMENT '场地类型',
      capacity INT NOT NULL DEFAULT 4 COMMENT '容量',
      location VARCHAR(200) COMMENT '位置',
      description TEXT COMMENT '描述',
      pricePerHour DECIMAL(10,2) DEFAULT 0 COMMENT '每小时价格',
      features JSON COMMENT '设施特色',
      image VARCHAR(500) COMMENT '场地图片',
      openTime TIME DEFAULT '08:00:00' COMMENT '开放时间',
      closeTime TIME DEFAULT '22:00:00' COMMENT '关闭时间',
      workingDays JSON COMMENT '工作日设置',
      advanceBookingDays INT DEFAULT 7 COMMENT '提前预约天数',
      minBookingHours INT DEFAULT 1 COMMENT '最小预约时长',
      maxBookingHours INT DEFAULT 4 COMMENT '最大预约时长',
      requireApproval BOOLEAN DEFAULT FALSE COMMENT '是否需要审批',
      allowCancellation BOOLEAN DEFAULT TRUE COMMENT '是否允许取消',
      status ENUM('active', 'inactive', 'maintenance', 'deleted') DEFAULT 'active' COMMENT '状态',
      sort INT DEFAULT 0 COMMENT '排序',
      managerId VARCHAR(36) COMMENT '管理员ID',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      createBy VARCHAR(36) COMMENT '创建人',
      
      INDEX idx_name (name),
      INDEX idx_code (code),
      INDEX idx_type (type),
      INDEX idx_status (status),
      INDEX idx_capacity (capacity),
      INDEX idx_manager (managerId),
      INDEX idx_sort (sort),
      FOREIGN KEY (managerId) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地表'
  `,

  // 13. 时间段表
  time_slots: `
    CREATE TABLE IF NOT EXISTS time_slots (
      _id VARCHAR(36) PRIMARY KEY COMMENT '时间段ID',
      venueId VARCHAR(36) NOT NULL COMMENT '场地ID',
      date DATE NOT NULL COMMENT '日期',
      startTime TIME NOT NULL COMMENT '开始时间',
      endTime TIME NOT NULL COMMENT '结束时间',
      status ENUM('available','booked','blocked','maintenance') DEFAULT 'available' COMMENT '状态',
      price DECIMAL(10,2) DEFAULT NULL COMMENT '价格',
      remark VARCHAR(200) DEFAULT NULL COMMENT '备注',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      createBy VARCHAR(36) DEFAULT NULL COMMENT '创建人',
      
      UNIQUE KEY uk_venue_date_time (venueId, date, startTime, endTime),
      INDEX idx_venue_id (venueId),
      INDEX idx_date (date),
      INDEX idx_status (status),
      FOREIGN KEY (venueId) REFERENCES venues(_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='时间段表'
  `,

  // ================================
  // 预约和订单表
  // ================================

  // 14. 场地预约表
  reservations: `
    CREATE TABLE IF NOT EXISTS reservations (
      _id VARCHAR(36) PRIMARY KEY COMMENT '预约ID',
      venueId VARCHAR(36) NOT NULL COMMENT '场地ID',
      timeSlotId VARCHAR(36) COMMENT '时间段ID',
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
      rejectReason TEXT COMMENT '拒绝原因',
      totalAmount DECIMAL(10,2) DEFAULT 0 COMMENT '总金额',
      status ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'completed') DEFAULT 'pending' COMMENT '状态',
      approvedBy VARCHAR(36) COMMENT '批准人ID',
      approveTime TIMESTAMP NULL COMMENT '批准时间',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      updateBy VARCHAR(36) COMMENT '更新人',
      
      INDEX idx_venue (venueId),
      INDEX idx_user (userId),
      INDEX idx_date (reservationDate),
      INDEX idx_time_range (reservationDate, startTime, endTime),
      INDEX idx_status (status),
      INDEX idx_approver (approvedBy),
      INDEX idx_create_time (createTime),
      INDEX idx_time_slot (timeSlotId),
      FOREIGN KEY (venueId) REFERENCES venues(_id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
      FOREIGN KEY (timeSlotId) REFERENCES time_slots(_id),
      FOREIGN KEY (approvedBy) REFERENCES users(_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地预约表'
  `,

  // 15. 日常报餐记录表
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
      dishes JSON COMMENT '菜品列表',
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

  // 16. 特殊预约表
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

  // ================================
  // 验证和认证表
  // ================================

  // 17. 用户令牌表
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

  // 18. 验证码表
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

  // 19. 餐桌表
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

  // 20. 用餐验证记录表
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

  // 21. 验证记录表 (通用)
  verification_records: `
    CREATE TABLE IF NOT EXISTS verification_records (
      _id VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
      userId VARCHAR(36) NOT NULL COMMENT '用户ID',
      verificationType VARCHAR(50) NOT NULL COMMENT '验证类型',
      verificationData JSON COMMENT '验证数据',
      status ENUM('verified','failed','expired') DEFAULT 'verified' COMMENT '验证状态',
      mealType ENUM('breakfast','lunch','dinner') DEFAULT NULL COMMENT '餐次类型',
      verificationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '验证时间',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      
      INDEX idx_user_id (userId),
      INDEX idx_verification_type (verificationType),
      INDEX idx_status (status),
      INDEX idx_verification_time (verificationTime),
      FOREIGN KEY (userId) REFERENCES users(_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证记录表'
  `,

  // ================================
  // 系统管理表
  // ================================

  // 22. 系统配置表
  system_configs: `
    CREATE TABLE IF NOT EXISTS system_configs (
      _id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
      category VARCHAR(50) NOT NULL COMMENT '配置分类',
      configKey VARCHAR(100) NOT NULL COMMENT '配置键',
      configValue TEXT COMMENT '配置值',
      dataType ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '数据类型',
      description TEXT COMMENT '配置描述',
      sort INT DEFAULT 0 COMMENT '排序',
      isPublic BOOLEAN DEFAULT FALSE COMMENT '是否公开',
      isEditable BOOLEAN DEFAULT TRUE COMMENT '是否可编辑',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      UNIQUE KEY uk_category_key (category, configKey),
      INDEX idx_category (category),
      INDEX idx_config_key (configKey),
      INDEX idx_is_public (isPublic),
      INDEX idx_is_editable (isEditable)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表'
  `,

  // 23. 验证方案表
  verification_schemes: `
    CREATE TABLE IF NOT EXISTS verification_schemes (
      _id INT AUTO_INCREMENT PRIMARY KEY COMMENT '方案ID',
      name VARCHAR(100) NOT NULL COMMENT '方案名称',
      description TEXT COMMENT '方案描述',
      type VARCHAR(50) NOT NULL COMMENT '验证类型',
      isEnabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
      config JSON COMMENT '方案配置',
      sort INT DEFAULT 0 COMMENT '排序',
      status ENUM('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      
      INDEX idx_type (type),
      INDEX idx_status (status),
      INDEX idx_sort (sort)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证方案表'
  `,

  // 24. 用户活动日志表
  user_activity_logs: `
    CREATE TABLE IF NOT EXISTS user_activity_logs (
      _id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
      userId VARCHAR(36) NOT NULL COMMENT '用户ID',
      action VARCHAR(50) NOT NULL COMMENT '操作类型',
      description TEXT COMMENT '操作描述',
      ip VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
      userAgent TEXT COMMENT '用户代理',
      createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      createBy VARCHAR(36) DEFAULT NULL COMMENT '操作人',
      
      INDEX idx_user_id (userId),
      INDEX idx_action (action),
      INDEX idx_create_time (createTime),
      FOREIGN KEY (userId) REFERENCES users(_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户活动日志表'
  `,

  // 25. 活动日志表
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

  // 26. 系统公告表
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

  // 27. 文件上传表
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
      category ENUM('avatar', 'document', 'image', 'dish_image', 'venue_image', 'other') DEFAULT 'other' COMMENT '文件分类',
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
    },
    {
      _id: uuidv4(),
      name: '行政部',
      code: 'ADMIN',
      level: 1,
      description: '行政管理部门'
    }
  ],

  // 默认角色
  roles: [
    {
      _id: uuidv4(),
      name: 'user',
      description: '普通用户'
    },
    {
      _id: uuidv4(),
      name: 'dept_admin',
      description: '部门管理员'
    },
    {
      _id: uuidv4(),
      name: 'admin',
      description: '普通管理员'
    },
    {
      _id: uuidv4(),
      name: 'sys_admin',
      description: '系统管理员'
    }
  ],

  // 默认权限
  permissions: [
    { _id: uuidv4(), name: '查看菜单', code: 'menu.view', description: '可以查看每日菜单', category: 'menu' },
    { _id: uuidv4(), name: '管理菜单', code: 'menu.manage', description: '可以创建和管理菜单', category: 'menu' },
    { _id: uuidv4(), name: '查看菜品', code: 'dish.view', description: '可以查看菜品信息', category: 'dish' },
    { _id: uuidv4(), name: '管理菜品', code: 'dish.manage', description: '可以创建和管理菜品', category: 'dish' },
    { _id: uuidv4(), name: '查看用户', code: 'user.view', description: '可以查看用户信息', category: 'user' },
    { _id: uuidv4(), name: '管理用户', code: 'user.manage', description: '可以创建和管理用户', category: 'user' },
    { _id: uuidv4(), name: '查看场地', code: 'venue.view', description: '可以查看场地信息', category: 'venue' },
    { _id: uuidv4(), name: '管理场地', code: 'venue.manage', description: '可以创建和管理场地', category: 'venue' },
    { _id: uuidv4(), name: '查看预约', code: 'reservation.view', description: '可以查看预约信息', category: 'reservation' },
    { _id: uuidv4(), name: '管理预约', code: 'reservation.manage', description: '可以审核和管理预约', category: 'reservation' },
    { _id: uuidv4(), name: '系统统计', code: 'system.stats', description: '可以查看系统统计数据', category: 'system' },
    { _id: uuidv4(), name: '系统配置', code: 'system.config', description: '可以修改系统配置', category: 'system' }
  ],

  // 默认菜品分类
  dish_categories: [
    { _id: uuidv4(), name: '热菜', description: '各类热炒菜品', icon: '🔥', color: '#ff6b6b', sort: 1 },
    { _id: uuidv4(), name: '凉菜', description: '各类凉拌菜品', icon: '🥗', color: '#51cf66', sort: 2 },
    { _id: uuidv4(), name: '汤品', description: '各类汤品', icon: '🍲', color: '#74c0fc', sort: 3 },
    { _id: uuidv4(), name: '主食', description: '米饭面条等主食', icon: '🍚', color: '#ffd43b', sort: 4 },
    { _id: uuidv4(), name: '饮品', description: '各类饮品', icon: '🥤', color: '#95cd95', sort: 5 }
  ],

  // 默认营养模板
  nutrition_templates: [
    { _id: uuidv4(), name: '标准模板', type: 'standard', calories: 300.00, protein: 20.00, fat: 15.00, carbohydrate: 25.00, description: '适用于一般菜品的营养配置' },
    { _id: uuidv4(), name: '低脂模板', type: 'low_fat', calories: 200.00, protein: 25.00, fat: 8.00, carbohydrate: 20.00, description: '适用于低脂菜品' },
    { _id: uuidv4(), name: '高蛋白模板', type: 'high_protein', calories: 350.00, protein: 35.00, fat: 12.00, carbohydrate: 18.00, description: '适用于高蛋白菜品' }
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
      pricePerHour: 50.00,
      description: '标准羽毛球场地',
      features: JSON.stringify(['灯光', '空调', '更衣室']),
      workingDays: JSON.stringify([1, 2, 3, 4, 5, 6, 7])
    },
    {
      _id: uuidv4(),
      name: '乒乓球台1号',
      code: 'TT001',
      type: 'pingpong',
      capacity: 4,
      location: 'B区2楼',
      pricePerHour: 20.00,
      description: '标准乒乓球台',
      features: JSON.stringify(['球拍', '乒乓球']),
      workingDays: JSON.stringify([1, 2, 3, 4, 5, 6, 7])
    },
    {
      _id: uuidv4(),
      name: '篮球场',
      code: 'BB001',
      type: 'basketball',
      capacity: 10,
      location: '室外运动场',
      pricePerHour: 100.00,
      description: '标准篮球场地',
      features: JSON.stringify(['篮球', '计分板']),
      workingDays: JSON.stringify([1, 2, 3, 4, 5, 6, 7])
    }
  ],

  // 餐桌数据
  dining_tables: [
    { _id: uuidv4(), tableName: 'A区01号桌', tableNumber: 'A001', location: 'A区', maxCapacity: 6, qrCode: 'TABLE_A001_QR', verificationCode: 'A001V' },
    { _id: uuidv4(), tableName: 'A区02号桌', tableNumber: 'A002', location: 'A区', maxCapacity: 6, qrCode: 'TABLE_A002_QR', verificationCode: 'A002V' },
    { _id: uuidv4(), tableName: 'B区01号桌', tableNumber: 'B001', location: 'B区', maxCapacity: 8, qrCode: 'TABLE_B001_QR', verificationCode: 'B001V' }
  ],

  // 系统配置数据
  system_configs: [
    { _id: uuidv4(), category: 'basic', configKey: 'systemName', configValue: '企业餐饮预约系统', description: '系统名称', sort: 1, isPublic: true },
    { _id: uuidv4(), category: 'basic', configKey: 'systemVersion', configValue: '2.0.0', description: '系统版本', sort: 2, isPublic: true },
    { _id: uuidv4(), category: 'basic', configKey: 'contactEmail', configValue: 'admin@example.com', description: '联系邮箱', sort: 3, isPublic: true },
    { _id: uuidv4(), category: 'basic', configKey: 'contactPhone', configValue: '400-123-4567', description: '联系电话', sort: 4, isPublic: true },
    { _id: uuidv4(), category: 'basic', configKey: 'companyAddress', configValue: '北京市朝阳区xxx大厦', description: '公司地址', sort: 5, isPublic: true },
    { _id: uuidv4(), category: 'business', configKey: 'reservationDays', configValue: '7', description: '预约提前天数', sort: 1, isPublic: true },
    { _id: uuidv4(), category: 'business', configKey: 'cancellationHours', configValue: '2', description: '取消预约提前小时数', sort: 2, isPublic: true },
    { _id: uuidv4(), category: 'business', configKey: 'defaultDuration', configValue: '1', description: '默认预约时长', sort: 3, isPublic: true },
    { _id: uuidv4(), category: 'business', configKey: 'diningDeadline', configValue: '09:00', description: '用餐截止时间', sort: 4, isPublic: true },
    { _id: uuidv4(), category: 'business', configKey: 'autoConfirm', configValue: 'false', description: '自动确认预约', sort: 5, isPublic: true },
    { _id: uuidv4(), category: 'business', configKey: 'smsNotification', configValue: 'true', description: '短信通知', sort: 6, isPublic: true }
  ],

  // 验证方案数据
  verification_schemes: [
    { name: '二维码验证', description: '用户扫码验证用餐资格', type: 'qr_code', config: JSON.stringify({validityMinutes: 30, codeLength: 6}), sort: 1 },
    { name: '工号验证', description: '通过工号验证用餐资格', type: 'employee_id', config: JSON.stringify({enableAutoComplete: true}), sort: 2 },
    { name: '人脸识别', description: '通过人脸识别验证用餐资格', type: 'face_recognition', config: JSON.stringify({threshold: 0.8}), sort: 3 }
  ],

  // 默认管理员用户
  admin_users: [
    {
      _id: uuidv4(),
      realName: '系统管理员',
      nickName: '系统管理员',
      phoneNumber: '13800000001',
      email: 'admin@example.com',
      password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8QBnfJz0zQGq8UcJeYI2KGAGHi5s4a', // 默认密码: admin123
      role: 'sys_admin',
      status: 'active',
      employeeId: 'ADMIN001'
    },
    {
      _id: uuidv4(),
      realName: '普通管理员',
      nickName: '普通管理员',
      phoneNumber: '13800000002',
      email: 'manager@example.com',
      password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8QBnfJz0zQGq8UcJeYI2KGAGHi5s4a', // 默认密码: admin123
      role: 'admin',
      status: 'active',
      employeeId: 'ADMIN002'
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
    
    // 创建数据库
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
      // 基础表（无依赖）
      'system_configs',
      'verification_codes',
      'dining_tables',
      'verification_schemes',
      'departments',
      
      // 角色权限表
      'roles',
      'permissions',
      'role_permissions',
      
      // 菜品相关表
      'dish_categories',
      'nutrition_templates',
      
      // 用户表（依赖部门表）
      'users',
      'user_tokens',
      'user_activity_logs',
      
      // 菜品表（依赖分类表）
      'dishes',
      
      // 菜单相关表（依赖用户表和菜品表）
      'menus',
      'menu_dishes',
      'menu_templates',
      
      // 场地相关表（依赖用户表）
      'venues',
      'time_slots',
      
      // 预约和订单表（依赖多个表）
      'reservations',
      'dining_orders',
      'special_reservations',
      'dining_verifications',
      'verification_records',
      
      // 系统表（依赖用户表）
      'system_announcements',
      'activity_logs',
      'file_uploads'
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
    
    // 1. 插入部门数据
    for (const dept of sampleData.departments) {
      await connection.query(
        `INSERT IGNORE INTO departments (_id, name, code, level, description, status, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [dept._id, dept.name, dept.code, dept.level, dept.description]
      );
    }
    logger.info('部门示例数据插入完成');
    
    // 2. 插入角色数据
    for (const role of sampleData.roles) {
      await connection.query(
        `INSERT IGNORE INTO roles (_id, name, description, status, createTime)
         VALUES (?, ?, ?, 'active', NOW())`,
        [role._id, role.name, role.description]
      );
    }
    logger.info('角色示例数据插入完成');
    
    // 3. 插入权限数据
    for (const permission of sampleData.permissions) {
      await connection.query(
        `INSERT IGNORE INTO permissions (_id, name, code, description, category, status, createTime)
         VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
        [permission._id, permission.name, permission.code, permission.description, permission.category]
      );
    }
    logger.info('权限示例数据插入完成');
    
    // 4. 插入菜品分类数据
    for (const category of sampleData.dish_categories) {
      await connection.query(
        `INSERT IGNORE INTO dish_categories (_id, name, description, icon, color, sort, status, createTime)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [category._id, category.name, category.description, category.icon, category.color, category.sort]
      );
    }
    logger.info('菜品分类示例数据插入完成');
    
    // 5. 插入营养模板数据
    for (const template of sampleData.nutrition_templates) {
      await connection.query(
        `INSERT IGNORE INTO nutrition_templates (_id, name, type, calories, protein, fat, carbohydrate, description, status, createTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [template._id, template.name, template.type, template.calories, template.protein, template.fat, template.carbohydrate, template.description]
      );
    }
    logger.info('营养模板示例数据插入完成');
    
    // 6. 插入默认管理员用户
    for (const user of sampleData.admin_users) {
      await connection.query(
        `INSERT IGNORE INTO users (_id, realName, nickName, phoneNumber, email, password, role, status, employeeId, createTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [user._id, user.realName, user.nickName, user.phoneNumber, user.email, user.password, user.role, user.status, user.employeeId]
      );
    }
    logger.info('默认管理员用户插入完成');
    
    // 7. 插入场地数据
    for (const venue of sampleData.venues) {
      await connection.query(
        `INSERT IGNORE INTO venues (_id, name, code, type, capacity, location, pricePerHour, description, features, workingDays, status, createTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [venue._id, venue.name, venue.code, venue.type, venue.capacity, venue.location, venue.pricePerHour, venue.description, venue.features, venue.workingDays]
      );
    }
    logger.info('场地示例数据插入完成');
    
    // 8. 插入餐桌数据
    for (const table of sampleData.dining_tables) {
      await connection.query(
        `INSERT IGNORE INTO dining_tables (_id, tableName, tableNumber, location, maxCapacity, qrCode, verificationCode, status, createTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'available', NOW())`,
        [table._id, table.tableName, table.tableNumber, table.location, table.maxCapacity, table.qrCode, table.verificationCode]
      );
    }
    logger.info('餐桌示例数据插入完成');
    
    // 9. 插入系统配置数据
    for (const config of sampleData.system_configs) {
      await connection.query(
        `INSERT IGNORE INTO system_configs (_id, category, configKey, configValue, description, sort, isPublic, isEditable, createTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [config._id, config.category, config.configKey, config.configValue, config.description, config.sort, config.isPublic]
      );
    }
    logger.info('系统配置示例数据插入完成');
    
    // 10. 插入验证方案数据
    for (const scheme of sampleData.verification_schemes) {
      await connection.query(
        `INSERT IGNORE INTO verification_schemes (name, description, type, config, sort, status, createTime)
         VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
        [scheme.name, scheme.description, scheme.type, scheme.config, scheme.sort]
      );
    }
    logger.info('验证方案示例数据插入完成');
    
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
    const [roleCount] = await connection.query('SELECT COUNT(*) as count FROM roles');
    const [permCount] = await connection.query('SELECT COUNT(*) as count FROM permissions');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [venueCount] = await connection.query('SELECT COUNT(*) as count FROM venues');
    const [tableCount] = await connection.query('SELECT COUNT(*) as count FROM dining_tables');
    const [configCount] = await connection.query('SELECT COUNT(*) as count FROM system_configs');
    const [categoryCount] = await connection.query('SELECT COUNT(*) as count FROM dish_categories');
    
    logger.info(`✅ 示例数据统计:`);
    logger.info(`   - 部门: ${deptCount[0].count} 条`);
    logger.info(`   - 角色: ${roleCount[0].count} 条`);
    logger.info(`   - 权限: ${permCount[0].count} 条`);
    logger.info(`   - 用户: ${userCount[0].count} 条`);
    logger.info(`   - 场地: ${venueCount[0].count} 条`);
    logger.info(`   - 餐桌: ${tableCount[0].count} 条`);
    logger.info(`   - 配置: ${configCount[0].count} 条`);
    logger.info(`   - 菜品分类: ${categoryCount[0].count} 条`);
    
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
      'file_uploads', 'activity_logs', 'system_announcements',
      'verification_records', 'dining_verifications', 'special_reservations',
      'dining_orders', 'reservations', 'time_slots', 'venues',
      'menu_templates', 'menu_dishes', 'menus', 'dishes',
      'user_activity_logs', 'user_tokens', 'users',
      'nutrition_templates', 'dish_categories',
      'role_permissions', 'permissions', 'roles',
      'departments', 'verification_schemes', 'dining_tables',
      'verification_codes', 'system_configs'
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
        logger.info('💡 默认管理员账号:');
        logger.info('   系统管理员 - 手机号: 13800000001, 密码: admin123');
        logger.info('   普通管理员 - 手机号: 13800000002, 密码: admin123');
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
        console.log('企业餐饮预约管理系统 - 完整数据库初始化脚本 v2.0.0');
        console.log('');
        console.log('使用方法:');
        console.log('  node scripts/initDatabaseComplete.js init    - 初始化数据库（创建数据库、表和示例数据）');
        console.log('  node scripts/initDatabaseComplete.js reset   - 重置数据库（删除所有数据后重新初始化）');
        console.log('  node scripts/initDatabaseComplete.js verify  - 验证数据库结构');
        console.log('  node scripts/initDatabaseComplete.js clean   - 清理数据库（删除所有表）');
        console.log('');
        console.log('包含功能:');
        console.log('  ✅ 原有基础系统表结构');
        console.log('  ✅ 新增管理员系统表结构');
        console.log('  ✅ 完整的角色权限管理');
        console.log('  ✅ 菜品和菜单管理');
        console.log('  ✅ 场地和预约管理');
        console.log('  ✅ 用户活动日志');
        console.log('  ✅ 系统配置管理');
        console.log('  ✅ 默认管理员账号');
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
