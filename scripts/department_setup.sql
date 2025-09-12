-- 部门设置SQL脚本
-- 此脚本用于创建所需的9个部门并设置部门管理员权限

-- 1. 首先确保departments表存在
CREATE TABLE IF NOT EXISTS departments (
  _id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  parentId VARCHAR(36) NULL,
  managerId VARCHAR(36) NULL,
  sort INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  createBy VARCHAR(36),
  updateTime DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updateBy VARCHAR(36),
  UNIQUE KEY unique_name (name)
);

-- 2. 创建所需的9个部门
INSERT INTO departments (_id, name, description, sort, status)
VALUES
  (UUID(), '地质数据中心', '负责地质数据的收集、管理和分析', 1, 'active'),
  (UUID(), '地质工程中心', '负责地质工程相关项目的规划和实施', 2, 'active'),
  (UUID(), '生态环境中心', '负责生态环境监测和保护工作', 3, 'active'),
  (UUID(), '地质环境中心', '负责地质环境调查和评估', 4, 'active'),
  (UUID(), '地质调查中心', '负责地质资源的调查和勘探', 5, 'active'),
  (UUID(), '黄梅分站', '黄梅地区的分支机构', 6, 'active'),
  (UUID(), '矿业有限责任公司', '负责矿业资源的开发和管理', 7, 'active'),
  (UUID(), '物业中心', '负责物业管理和服务', 8, 'active'),
  (UUID(), '机关科室', '负责行政和管理工作', 9, 'active')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  sort = VALUES(sort),
  status = VALUES(status),
  updateTime = CURRENT_TIMESTAMP;

-- 3. 确保roles表中存在dept_admin角色
INSERT INTO roles (name, description, status, create_time)
SELECT 'dept_admin', '部门管理员', 'active', CURRENT_TIMESTAMP
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'dept_admin');

-- 4. 查询所有部门ID，用于后续设置管理员
SELECT _id, name FROM departments WHERE status = 'active';

-- 注意：以下为示例，实际使用时需要替换为真实的用户ID
-- 例如：UPDATE departments SET managerId = '实际用户ID' WHERE name = '地质数据中心';

-- 5. 设置部门管理员权限视图（方便查询）
CREATE OR REPLACE VIEW v_department_managers AS
SELECT 
  d._id as deptId,
  d.name as deptName,
  u._id as managerId,
  u.nickName as managerName,
  u.phoneNumber as managerPhone
FROM departments d
LEFT JOIN users u ON d.managerId = u._id
WHERE d.status = 'active';

-- 6. 为部门管理员添加报餐权限视图
CREATE OR REPLACE VIEW v_department_dining_permissions AS
SELECT 
  u._id as userId,
  u.nickName as userName,
  u.role as userRole,
  d._id as deptId,
  d.name as deptName,
  d.managerId as deptManagerId
FROM users u
LEFT JOIN departments d ON u.departmentId = d._id
WHERE u.role = 'dept_admin' AND u.status = 'active' AND d.status = 'active';