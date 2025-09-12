# 智慧物业管理系统 - 数据库说明文档

## 📖 概述

本文档详细说明智慧物业管理系统的数据库设计、表结构、关系模型和初始化流程。系统采用MySQL 8.0+作为主数据库，包含15个核心表，覆盖用户管理、报餐预约、场地管理、用餐验证等全部业务功能。

## 🏗️ 数据库架构

### 技术规格
- **数据库类型**: MySQL 8.0+
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **存储引擎**: InnoDB
- **连接池**: 支持连接池管理

### 设计原则
1. **规范化设计**: 遵循第三范式，减少数据冗余
2. **性能优化**: 合理设置索引，优化查询性能
3. **扩展性**: 预留扩展字段，支持业务发展
4. **数据完整性**: 使用外键约束保证数据一致性
5. **安全性**: 敏感数据适当处理，操作日志完整

## 📊 表结构详解

### 1. 核心用户管理模块

#### users (用户表)
存储所有用户的基本信息，支持微信和手机号登录

**表结构**:
```sql
CREATE TABLE users (
  _id VARCHAR(36) PRIMARY KEY COMMENT '用户ID',
  openid VARCHAR(100) UNIQUE COMMENT '微信openid',
  unionid VARCHAR(100) COMMENT '微信unionid',
  nickName VARCHAR(100) NOT NULL COMMENT '用户昵称',
  avatarUrl TEXT COMMENT '头像URL',
  phoneNumber VARCHAR(11) UNIQUE COMMENT '手机号',
  email VARCHAR(100) COMMENT '邮箱',
  gender TINYINT DEFAULT 0 COMMENT '性别: 0-未知,1-男,2-女',
  department VARCHAR(100) COMMENT '部门',
  departmentId VARCHAR(36) COMMENT '部门ID',
  role ENUM('user', 'dept_admin', 'sys_admin', 'verifier') DEFAULT 'user' COMMENT '角色',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  lastLoginTime TIMESTAMP NULL COMMENT '最后登录时间',
  isTestUser BOOLEAN DEFAULT FALSE COMMENT '是否为测试用户',
  isAdminTest BOOLEAN DEFAULT FALSE COMMENT '是否为部门管理员测试用户',
  isSysAdminTest BOOLEAN DEFAULT FALSE COMMENT '是否为系统管理员测试用户'
);
```

**关键索引**:
- `idx_openid` - 微信登录优化
- `idx_phone` - 手机号登录优化
- `idx_department` - 部门查询优化
- `idx_role` - 角色权限查询优化

#### departments (部门表)
标准化的部门信息管理，支持层级结构

**表结构**:
```sql
CREATE TABLE departments (
  _id VARCHAR(36) PRIMARY KEY COMMENT '部门ID',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  code VARCHAR(20) UNIQUE COMMENT '部门编码',
  parentId VARCHAR(36) COMMENT '父级部门ID',
  level INT DEFAULT 1 COMMENT '部门层级',
  description TEXT COMMENT '部门描述',
  managerId VARCHAR(36) COMMENT '部门负责人ID',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

#### user_tokens (用户令牌表)
JWT Token管理，支持多端登录和设备管理

**表结构**:
```sql
CREATE TABLE user_tokens (
  _id VARCHAR(36) PRIMARY KEY COMMENT 'Token ID',
  userId VARCHAR(36) NOT NULL COMMENT '用户ID',
  openid VARCHAR(100) COMMENT '微信openid',
  phoneNumber VARCHAR(11) COMMENT '手机号',
  token TEXT NOT NULL COMMENT 'JWT Token',
  deviceInfo JSON COMMENT '设备信息',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  expireTime TIMESTAMP NOT NULL COMMENT '过期时间',
  lastUsedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后使用时间',
  isTestToken BOOLEAN DEFAULT FALSE COMMENT '是否为测试Token'
);
```

#### verification_codes (验证码表)
短信验证码管理，防止滥用和暴力破解

**表结构**:
```sql
CREATE TABLE verification_codes (
  _id VARCHAR(36) PRIMARY KEY COMMENT '验证码ID',
  phoneNumber VARCHAR(11) NOT NULL COMMENT '手机号',
  code VARCHAR(6) NOT NULL COMMENT '验证码',
  type ENUM('login', 'register', 'reset') DEFAULT 'login' COMMENT '验证码类型',
  status ENUM('unused', 'used', 'expired') DEFAULT 'unused' COMMENT '状态',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  expireTime TIMESTAMP NOT NULL COMMENT '过期时间',
  usedTime TIMESTAMP NULL COMMENT '使用时间',
  ipAddress VARCHAR(45) COMMENT '请求IP地址'
);
```

### 2. 报餐管理系统模块

#### menus (菜单表)
每日菜单发布管理，支持多餐次和容量控制

**表结构**:
```sql
CREATE TABLE menus (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

**业务规则**:
- 每天每餐次只能有一个菜单 (唯一约束: `uk_date_meal`)
- 支持容量限制和超额控制
- 菜品信息以JSON格式存储，便于扩展

#### dining_orders (报餐记录表)
日常报餐订单管理，支持部门批量报餐

**表结构**:
```sql
CREATE TABLE dining_orders (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

#### special_reservations (特殊预约表)
特殊预约申请和审核流程管理

**表结构**:
```sql
CREATE TABLE special_reservations (
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
  isSpecialReservation BOOLEAN DEFAULT TRUE COMMENT '是否为特殊预约'
);
```

### 3. 场地预约系统模块

#### venues (场地表)
场地基本信息管理，支持多种场地类型

**表结构**:
```sql
CREATE TABLE venues (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

#### reservations (场地预约表)
场地预约信息管理，防止时间冲突

**表结构**:
```sql
CREATE TABLE reservations (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

**业务规则**:
- 同一场地同一时间段只能有一个预约 (唯一约束: `uk_venue_time`)
- 支持预约状态流转和审核流程

### 4. 用餐验证系统模块

#### dining_tables (餐桌表)
餐桌信息管理，支持二维码验证

**表结构**:
```sql
CREATE TABLE dining_tables (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

#### dining_verifications (用餐验证记录表)
用餐验证信息记录，统计用餐数据

**表结构**:
```sql
CREATE TABLE dining_verifications (
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
  remark TEXT COMMENT '备注'
);
```

### 5. 系统管理模块

#### system_announcements (系统公告表)
系统公告和通知信息管理

**表结构**:
```sql
CREATE TABLE system_announcements (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

#### activity_logs (活动日志表)
系统重要操作日志记录

**表结构**:
```sql
CREATE TABLE activity_logs (
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
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
);
```

#### file_uploads (文件上传表)
文件上传管理，支持头像和其他文件

**表结构**:
```sql
CREATE TABLE file_uploads (
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
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

#### system_configs (系统配置表)
系统配置参数管理

**表结构**:
```sql
CREATE TABLE system_configs (
  _id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  configKey VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  configValue TEXT COMMENT '配置值',
  dataType ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '数据类型',
  category VARCHAR(50) DEFAULT 'general' COMMENT '配置分类',
  description TEXT COMMENT '配置描述',
  isPublic BOOLEAN DEFAULT FALSE COMMENT '是否公开',
  isEditable BOOLEAN DEFAULT TRUE COMMENT '是否可编辑',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);
```

## 🔗 表关系图

### 核心关系
```
users (用户表)
├── departments (部门表) [1:N]
├── user_tokens (用户令牌表) [1:N]
├── dining_orders (报餐记录表) [1:N]
├── special_reservations (特殊预约表) [1:N]
├── reservations (场地预约表) [1:N]
├── dining_verifications (用餐验证记录表) [1:N]
├── system_announcements (系统公告表) [1:N]
├── activity_logs (活动日志表) [1:N]
└── file_uploads (文件上传表) [1:N]

menus (菜单表)
└── dining_orders (报餐记录表) [1:N]

venues (场地表)
└── reservations (场地预约表) [1:N]

dining_tables (餐桌表)
└── dining_verifications (用餐验证记录表) [1:N]
```

## 📈 性能优化

### 索引策略
1. **主键索引**: 所有表使用UUID作为主键
2. **唯一索引**: 手机号、邮箱、编码等唯一字段
3. **复合索引**: 查询频繁的字段组合
4. **外键索引**: 关联查询优化

### 查询优化
1. **分页查询**: 使用LIMIT和OFFSET
2. **时间范围查询**: 日期字段索引优化
3. **状态查询**: 枚举字段索引
4. **JSON字段查询**: 使用MySQL JSON函数

## 🔒 安全设计

### 数据安全
1. **敏感数据**: 密码哈希存储，手机号脱敏
2. **权限控制**: 基于角色的访问控制
3. **操作审计**: 完整的操作日志记录
4. **数据备份**: 定期备份和恢复机制

### 访问控制
1. **连接限制**: 数据库连接池管理
2. **查询限制**: 防止SQL注入
3. **事务控制**: 保证数据一致性
4. **锁机制**: 防止并发冲突

## 🚀 初始化流程

### 1. 数据库创建
```sql
CREATE DATABASE smart_property 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 2. 表结构创建
按依赖关系顺序创建表：
1. 基础表 (无依赖)
2. 用户相关表
3. 业务表
4. 扩展表

### 3. 示例数据插入
- 部门数据
- 场地数据
- 餐桌数据
- 系统配置数据

### 4. 数据验证
- 表结构验证
- 数据完整性检查
- 索引有效性验证

## 📊 数据统计

### 表数量统计
- **核心表**: 4个 (用户、部门、令牌、验证码)
- **业务表**: 6个 (菜单、报餐、预约、场地、餐桌、验证)
- **扩展表**: 5个 (公告、日志、文件、配置、活动)
- **总计**: 15个表

### 字段类型分布
- **VARCHAR**: 字符串字段
- **TEXT**: 长文本字段
- **JSON**: 结构化数据字段
- **ENUM**: 枚举字段
- **TIMESTAMP**: 时间字段
- **DECIMAL**: 金额字段
- **INT**: 数值字段
- **BOOLEAN**: 布尔字段

## 🔧 维护建议

### 定期维护
1. **索引优化**: 定期分析查询性能
2. **数据清理**: 清理过期日志和临时数据
3. **备份恢复**: 定期备份和恢复测试
4. **性能监控**: 监控数据库性能指标

### 扩展建议
1. **分库分表**: 数据量增长时考虑分库分表
2. **读写分离**: 高并发时考虑读写分离
3. **缓存优化**: 使用Redis等缓存技术
4. **监控告警**: 建立完善的监控告警体系

---

**文档版本**: v1.4.0  
**最后更新**: 2025年1月  
**维护团队**: 湖北省地质局第三地质大队
