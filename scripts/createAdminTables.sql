-- 管理员系统数据库表结构
-- 创建日期: 2024-01-01
-- 版本: 1.0.0

-- ================================
-- 菜单相关表
-- ================================

-- 菜单表
CREATE TABLE IF NOT EXISTS `menus` (
  `id` varchar(36) NOT NULL COMMENT '菜单ID',
  `date` date NOT NULL COMMENT '日期',
  `meal_type` enum('breakfast','lunch','dinner') NOT NULL COMMENT '餐次类型',
  `description` text COMMENT '菜单描述',
  `status` enum('draft','published','revoked') DEFAULT 'draft' COMMENT '状态',
  `admin_id` varchar(36) NOT NULL COMMENT '管理员ID',
  `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
  `effective_time` datetime DEFAULT NULL COMMENT '生效时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(36) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_date_meal` (`date`, `meal_type`),
  KEY `idx_status` (`status`),
  KEY `idx_admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单表';

-- 菜单菜品关联表
CREATE TABLE IF NOT EXISTS `menu_dishes` (
  `id` varchar(36) NOT NULL COMMENT '关联ID',
  `menu_id` varchar(36) NOT NULL COMMENT '菜单ID',
  `dish_id` varchar(36) NOT NULL COMMENT '菜品ID',
  `price` decimal(10,2) DEFAULT 0.00 COMMENT '价格',
  `sort` int(11) DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_menu_id` (`menu_id`),
  KEY `idx_dish_id` (`dish_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单菜品关联表';

-- 菜单模板表
CREATE TABLE IF NOT EXISTS `menu_templates` (
  `id` varchar(36) NOT NULL COMMENT '模板ID',
  `name` varchar(100) NOT NULL COMMENT '模板名称',
  `meal_type` enum('breakfast','lunch','dinner') NOT NULL COMMENT '餐次类型',
  `description` text COMMENT '模板描述',
  `dishes` json COMMENT '菜品列表',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  KEY `idx_meal_type` (`meal_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单模板表';

-- ================================
-- 菜品相关表
-- ================================

-- 菜品分类表
CREATE TABLE IF NOT EXISTS `dish_categories` (
  `id` varchar(36) NOT NULL COMMENT '分类ID',
  `name` varchar(50) NOT NULL COMMENT '分类名称',
  `description` varchar(200) DEFAULT NULL COMMENT '分类描述',
  `icon` varchar(10) DEFAULT NULL COMMENT '图标',
  `color` varchar(7) DEFAULT NULL COMMENT '颜色代码',
  `sort` int(11) DEFAULT 0 COMMENT '排序',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品分类表';

-- 插入默认菜品分类
INSERT IGNORE INTO `dish_categories` (`id`, `name`, `description`, `icon`, `color`, `sort`, `status`) VALUES
('cat_001', '热菜', '各类热炒菜品', '🔥', '#ff6b6b', 1, 'active'),
('cat_002', '凉菜', '各类凉拌菜品', '🥗', '#51cf66', 2, 'active'),
('cat_003', '汤品', '各类汤品', '🍲', '#74c0fc', 3, 'active'),
('cat_004', '主食', '米饭面条等主食', '🍚', '#ffd43b', 4, 'active'),
('cat_005', '饮品', '各类饮品', '🥤', '#95cd95', 5, 'active');

-- 菜品表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS `dishes` (
  `id` varchar(36) NOT NULL COMMENT '菜品ID',
  `name` varchar(100) NOT NULL COMMENT '菜品名称',
  `category_id` varchar(36) NOT NULL COMMENT '分类ID',
  `description` text COMMENT '菜品描述',
  `price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '价格',
  `image` varchar(500) DEFAULT NULL COMMENT '图片URL',
  `calories` decimal(8,2) DEFAULT NULL COMMENT '卡路里',
  `protein` decimal(8,2) DEFAULT NULL COMMENT '蛋白质(g)',
  `fat` decimal(8,2) DEFAULT NULL COMMENT '脂肪(g)',
  `carbohydrate` decimal(8,2) DEFAULT NULL COMMENT '碳水化合物(g)',
  `tags` json COMMENT '标签',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `is_recommended` tinyint(1) DEFAULT 0 COMMENT '是否推荐',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_recommended` (`is_recommended`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜品表';

-- 营养模板表
CREATE TABLE IF NOT EXISTS `nutrition_templates` (
  `id` varchar(36) NOT NULL COMMENT '模板ID',
  `name` varchar(50) NOT NULL COMMENT '模板名称',
  `type` varchar(20) NOT NULL COMMENT '模板类型',
  `calories` decimal(8,2) DEFAULT NULL COMMENT '卡路里',
  `protein` decimal(8,2) DEFAULT NULL COMMENT '蛋白质(g)',
  `fat` decimal(8,2) DEFAULT NULL COMMENT '脂肪(g)',
  `carbohydrate` decimal(8,2) DEFAULT NULL COMMENT '碳水化合物(g)',
  `description` text COMMENT '模板描述',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营养模板表';

-- 插入默认营养模板
INSERT IGNORE INTO `nutrition_templates` (`id`, `name`, `type`, `calories`, `protein`, `fat`, `carbohydrate`, `description`) VALUES
('nutrition_001', '标准模板', 'standard', 300.00, 20.00, 15.00, 25.00, '适用于一般菜品的营养配置'),
('nutrition_002', '低脂模板', 'low_fat', 200.00, 25.00, 8.00, 20.00, '适用于低脂菜品'),
('nutrition_003', '高蛋白模板', 'high_protein', 350.00, 35.00, 12.00, 18.00, '适用于高蛋白菜品');

-- ================================
-- 角色权限相关表
-- ================================

-- 角色表
CREATE TABLE IF NOT EXISTS `roles` (
  `id` varchar(36) NOT NULL COMMENT '角色ID',
  `name` varchar(50) NOT NULL COMMENT '角色名称',
  `description` varchar(200) DEFAULT NULL COMMENT '角色描述',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` varchar(36) NOT NULL COMMENT '权限ID',
  `name` varchar(50) NOT NULL COMMENT '权限名称',
  `code` varchar(50) NOT NULL COMMENT '权限代码',
  `description` varchar(200) DEFAULT NULL COMMENT '权限描述',
  `category` varchar(20) DEFAULT NULL COMMENT '权限分类',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` varchar(36) NOT NULL COMMENT '角色ID',
  `permission_id` varchar(36) NOT NULL COMMENT '权限ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

-- 插入默认权限
INSERT IGNORE INTO `permissions` (`id`, `name`, `code`, `description`, `category`) VALUES
('perm_001', '查看菜单', 'menu.view', '可以查看每日菜单', 'menu'),
('perm_002', '管理菜单', 'menu.manage', '可以创建和管理菜单', 'menu'),
('perm_003', '查看菜品', 'dish.view', '可以查看菜品信息', 'dish'),
('perm_004', '管理菜品', 'dish.manage', '可以创建和管理菜品', 'dish'),
('perm_005', '查看用户', 'user.view', '可以查看用户信息', 'user'),
('perm_006', '管理用户', 'user.manage', '可以创建和管理用户', 'user'),
('perm_007', '查看场地', 'venue.view', '可以查看场地信息', 'venue'),
('perm_008', '管理场地', 'venue.manage', '可以创建和管理场地', 'venue'),
('perm_009', '查看预约', 'reservation.view', '可以查看预约信息', 'reservation'),
('perm_010', '管理预约', 'reservation.manage', '可以审核和管理预约', 'reservation'),
('perm_011', '系统统计', 'system.stats', '可以查看系统统计数据', 'system'),
('perm_012', '系统配置', 'system.config', '可以修改系统配置', 'system');

-- 插入默认角色
INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES
('role_001', 'user', '普通用户'),
('role_002', 'admin', '普通管理员'),
('role_003', 'sys_admin', '系统管理员');

-- ================================
-- 部门表
-- ================================

CREATE TABLE IF NOT EXISTS `departments` (
  `id` varchar(36) NOT NULL COMMENT '部门ID',
  `name` varchar(100) NOT NULL COMMENT '部门名称',
  `description` varchar(200) DEFAULT NULL COMMENT '部门描述',
  `parent_id` varchar(36) DEFAULT NULL COMMENT '上级部门ID',
  `level` int(11) DEFAULT 1 COMMENT '部门层级',
  `sort` int(11) DEFAULT 0 COMMENT '排序',
  `manager_id` varchar(36) DEFAULT NULL COMMENT '部门经理ID',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_manager_id` (`manager_id`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

-- 插入默认部门
INSERT IGNORE INTO `departments` (`id`, `name`, `description`, `sort`) VALUES
('dept_001', '技术部', '负责技术开发和维护', 1),
('dept_002', '行政部', '负责行政管理', 2),
('dept_003', '财务部', '负责财务管理', 3),
('dept_004', '人事部', '负责人力资源管理', 4);

-- ================================
-- 场地相关表
-- ================================

-- 场地表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS `venues` (
  `id` varchar(36) NOT NULL COMMENT '场地ID',
  `name` varchar(100) NOT NULL COMMENT '场地名称',
  `type` varchar(50) NOT NULL COMMENT '场地类型',
  `description` text COMMENT '场地描述',
  `location` varchar(200) DEFAULT NULL COMMENT '场地位置',
  `capacity` int(11) NOT NULL DEFAULT 1 COMMENT '容纳人数',
  `price_per_hour` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '每小时价格',
  `features` json COMMENT '设施特色',
  `image` varchar(500) DEFAULT NULL COMMENT '场地图片',
  `open_time` time NOT NULL COMMENT '开放时间',
  `close_time` time NOT NULL COMMENT '关闭时间',
  `working_days` json COMMENT '工作日设置',
  `advance_booking_days` int(11) DEFAULT 7 COMMENT '提前预约天数',
  `min_booking_hours` int(11) DEFAULT 1 COMMENT '最小预约时长',
  `max_booking_hours` int(11) DEFAULT 4 COMMENT '最大预约时长',
  `require_approval` tinyint(1) DEFAULT 0 COMMENT '是否需要审批',
  `allow_cancellation` tinyint(1) DEFAULT 1 COMMENT '是否允许取消',
  `status` enum('active','inactive','maintenance','deleted') DEFAULT 'active' COMMENT '状态',
  `sort` int(11) DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场地表';

-- 时间段表
CREATE TABLE IF NOT EXISTS `time_slots` (
  `id` varchar(36) NOT NULL COMMENT '时间段ID',
  `venue_id` varchar(36) NOT NULL COMMENT '场地ID',
  `date` date NOT NULL COMMENT '日期',
  `start_time` time NOT NULL COMMENT '开始时间',
  `end_time` time NOT NULL COMMENT '结束时间',
  `status` enum('available','booked','blocked','maintenance') DEFAULT 'available' COMMENT '状态',
  `price` decimal(10,2) DEFAULT NULL COMMENT '价格',
  `remark` varchar(200) DEFAULT NULL COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_venue_date_time` (`venue_id`, `date`, `start_time`, `end_time`),
  KEY `idx_venue_id` (`venue_id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='时间段表';

-- ================================
-- 预约相关表（如果不存在则创建）
-- ================================

CREATE TABLE IF NOT EXISTS `reservations` (
  `id` varchar(36) NOT NULL COMMENT '预约ID',
  `venue_id` varchar(36) NOT NULL COMMENT '场地ID',
  `time_slot_id` varchar(36) DEFAULT NULL COMMENT '时间段ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `date` date NOT NULL COMMENT '预约日期',
  `start_time` time NOT NULL COMMENT '开始时间',
  `end_time` time NOT NULL COMMENT '结束时间',
  `duration` int(11) NOT NULL COMMENT '预约时长(小时)',
  `total_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '总价格',
  `status` enum('pending','confirmed','rejected','cancelled','completed') DEFAULT 'pending' COMMENT '状态',
  `remark` text COMMENT '备注',
  `reject_reason` text COMMENT '拒绝原因',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(36) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_venue_id` (`venue_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  KEY `idx_time_slot_id` (`time_slot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约表';

-- ================================
-- 用户活动日志表
-- ================================

CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id` varchar(36) NOT NULL COMMENT '日志ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `action` varchar(50) NOT NULL COMMENT '操作类型',
  `description` text COMMENT '操作描述',
  `ip` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text COMMENT '用户代理',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(36) DEFAULT NULL COMMENT '操作人',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户活动日志表';

-- ================================
-- 系统配置表
-- ================================

CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `category` varchar(50) NOT NULL COMMENT '配置分类',
  `key` varchar(100) NOT NULL COMMENT '配置键',
  `value` text COMMENT '配置值',
  `description` varchar(200) DEFAULT NULL COMMENT '配置描述',
  `sort` int(11) DEFAULT 0 COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_key` (`category`, `key`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入默认系统配置
INSERT IGNORE INTO `system_configs` (`category`, `key`, `value`, `description`, `sort`) VALUES
('basic', 'systemName', '企业餐饮预约系统', '系统名称', 1),
('basic', 'systemVersion', '1.0.0', '系统版本', 2),
('basic', 'contactEmail', 'admin@example.com', '联系邮箱', 3),
('basic', 'contactPhone', '400-123-4567', '联系电话', 4),
('basic', 'companyAddress', '北京市朝阳区xxx大厦', '公司地址', 5),
('business', 'reservationDays', '7', '预约提前天数', 1),
('business', 'cancellationHours', '2', '取消预约提前小时数', 2),
('business', 'defaultDuration', '1', '默认预约时长', 3),
('business', 'diningDeadline', '09:00', '用餐截止时间', 4),
('business', 'autoConfirm', 'false', '自动确认预约', 5),
('business', 'smsNotification', 'true', '短信通知', 6);

-- ================================
-- 验证方案表
-- ================================

CREATE TABLE IF NOT EXISTS `verification_schemes` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '方案ID',
  `name` varchar(100) NOT NULL COMMENT '方案名称',
  `description` text COMMENT '方案描述',
  `type` varchar(50) NOT NULL COMMENT '验证类型',
  `is_enabled` tinyint(1) DEFAULT 1 COMMENT '是否启用',
  `config` json COMMENT '方案配置',
  `sort` int(11) DEFAULT 0 COMMENT '排序',
  `status` enum('active','inactive','deleted') DEFAULT 'active' COMMENT '状态',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证方案表';

-- 插入默认验证方案
INSERT IGNORE INTO `verification_schemes` (`name`, `description`, `type`, `config`, `sort`) VALUES
('二维码验证', '用户扫码验证用餐资格', 'qr_code', '{"validityMinutes": 30, "codeLength": 6}', 1),
('工号验证', '通过工号验证用餐资格', 'employee_id', '{"enableAutoComplete": true}', 2),
('人脸识别', '通过人脸识别验证用餐资格', 'face_recognition', '{"threshold": 0.8}', 3);

-- ================================
-- 验证记录表
-- ================================

CREATE TABLE IF NOT EXISTS `verification_records` (
  `id` varchar(36) NOT NULL COMMENT '记录ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `verification_type` varchar(50) NOT NULL COMMENT '验证类型',
  `verification_data` json COMMENT '验证数据',
  `status` enum('verified','failed','expired') DEFAULT 'verified' COMMENT '验证状态',
  `meal_type` enum('breakfast','lunch','dinner') DEFAULT NULL COMMENT '餐次类型',
  `verification_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '验证时间',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_verification_type` (`verification_type`),
  KEY `idx_status` (`status`),
  KEY `idx_verification_time` (`verification_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证记录表';

-- ================================
-- 用餐订单表（如果不存在则创建）
-- ================================

CREATE TABLE IF NOT EXISTS `dining_orders` (
  `id` varchar(36) NOT NULL COMMENT '订单ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `order_date` date NOT NULL COMMENT '订餐日期',
  `meal_type` enum('breakfast','lunch','dinner') NOT NULL COMMENT '餐次类型',
  `dishes` json COMMENT '菜品列表',
  `total_amount` decimal(10,2) DEFAULT 0.00 COMMENT '总金额',
  `status` enum('pending','confirmed','cancelled','completed') DEFAULT 'pending' COMMENT '订单状态',
  `remark` text COMMENT '备注',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_meal_type` (`meal_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用餐订单表';

-- ================================
-- 创建索引优化
-- ================================

-- 用户表索引
ALTER TABLE `users` 
ADD INDEX IF NOT EXISTS `idx_role` (`role`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`),
ADD INDEX IF NOT EXISTS `idx_department_id` (`department_id`),
ADD INDEX IF NOT EXISTS `idx_phone_number` (`phone_number`),
ADD INDEX IF NOT EXISTS `idx_employee_id` (`employee_id`);

-- ================================
-- 外键约束（可选，根据需要启用）
-- ================================

-- 注意：由于使用UUID作为主键，外键约束可能影响性能
-- 如需启用外键约束，请取消以下注释

/*
-- 菜单相关外键
ALTER TABLE `menu_dishes` 
ADD CONSTRAINT `fk_menu_dishes_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `fk_menu_dishes_dish` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`id`) ON DELETE CASCADE;

-- 菜品相关外键
ALTER TABLE `dishes` 
ADD CONSTRAINT `fk_dishes_category` FOREIGN KEY (`category_id`) REFERENCES `dish_categories` (`id`);

-- 用户相关外键
ALTER TABLE `users` 
ADD CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`);

-- 角色权限外键
ALTER TABLE `role_permissions` 
ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

-- 部门外键
ALTER TABLE `departments` 
ADD CONSTRAINT `fk_departments_parent` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`),
ADD CONSTRAINT `fk_departments_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`);

-- 场地相关外键
ALTER TABLE `time_slots` 
ADD CONSTRAINT `fk_time_slots_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE CASCADE;

-- 预约相关外键
ALTER TABLE `reservations` 
ADD CONSTRAINT `fk_reservations_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`),
ADD CONSTRAINT `fk_reservations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
ADD CONSTRAINT `fk_reservations_time_slot` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`);

-- 日志外键
ALTER TABLE `user_activity_logs` 
ADD CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

-- 验证记录外键
ALTER TABLE `verification_records` 
ADD CONSTRAINT `fk_verification_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

-- 订单外键
ALTER TABLE `dining_orders` 
ADD CONSTRAINT `fk_dining_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
*/
