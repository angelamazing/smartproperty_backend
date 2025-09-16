# 智慧物业管理系统 - 数据库表关系图

## 📊 表关系概览

```
智慧物业管理系统数据库
├── 核心用户管理模块
│   ├── users (用户表) [主表]
│   │   ├── departments (部门表) [1:N] - departmentId
│   │   ├── user_tokens (用户令牌表) [1:N] - userId
│   │   ├── dining_orders (报餐记录表) [1:N] - registrantId
│   │   ├── special_reservations (特殊预约表) [1:N] - applicantId
│   │   ├── reservations (场地预约表) [1:N] - userId
│   │   ├── dining_verifications (用餐验证记录表) [1:N] - userId
│   │   ├── system_announcements (系统公告表) [1:N] - publisherId
│   │   ├── activity_logs (活动日志表) [1:N] - userId
│   │   └── file_uploads (文件上传表) [1:N] - uploaderId
│   └── verification_codes (验证码表) [独立表]
├── 报餐管理模块
│   ├── menus (菜单表) [主表]
│   │   └── dining_orders (报餐记录表) [1:N] - menuId
│   └── dining_orders (报餐记录表)
│       ├── users (用户表) [N:1] - registrantId
│       ├── departments (部门表) [N:1] - deptId
│       └── dining_verifications (用餐验证记录表) [1:N] - orderId
├── 场地预约模块
│   ├── venues (场地表) [主表]
│   │   └── reservations (场地预约表) [1:N] - venueId
│   └── reservations (场地预约表)
│       └── users (用户表) [N:1] - userId
├── 用餐验证模块
│   ├── dining_tables (餐桌表) [主表]
│   │   └── dining_verifications (用餐验证记录表) [1:N] - tableId
│   └── dining_verifications (用餐验证记录表)
│       ├── users (用户表) [N:1] - userId
│       ├── dining_tables (餐桌表) [N:1] - tableId
│       └── dining_orders (报餐记录表) [N:1] - orderId
└── 系统管理模块
    ├── system_configs (系统配置表) [独立表]
    ├── system_announcements (系统公告表)
    │   └── users (用户表) [N:1] - publisherId
    └── activity_logs (活动日志表)
        └── users (用户表) [N:1] - userId
```

## 🔗 详细表关系说明

### 1. 用户表 (users) - 核心表
**作用**: 存储所有用户信息，是系统的核心表

**关联关系**:
- `departments` [N:1] - 通过 `departmentId` 关联
- `user_tokens` [1:N] - 一个用户可以有多个令牌
- `dining_orders` [1:N] - 一个用户可以创建多个报餐记录
- `special_reservations` [1:N] - 一个用户可以申请多个特殊预约
- `reservations` [1:N] - 一个用户可以预约多个场地
- `dining_verifications` [1:N] - 一个用户可以有多个用餐验证记录
- `system_announcements` [1:N] - 一个用户可以发布多个公告
- `activity_logs` [1:N] - 一个用户可以有多个活动日志
- `file_uploads` [1:N] - 一个用户可以上传多个文件

### 2. 部门表 (departments) - 组织架构
**作用**: 管理组织架构，支持层级结构

**关联关系**:
- `users` [1:N] - 一个部门可以有多个用户
- `dining_orders` [1:N] - 一个部门可以有多个报餐记录
- `special_reservations` [1:N] - 一个部门可以有多个特殊预约
- `departments` [1:N] - 自关联，支持部门层级

### 3. 菜单表 (menus) - 报餐管理
**作用**: 管理每日菜单信息

**关联关系**:
- `users` [N:1] - 通过 `publisherId` 关联发布人
- `dining_orders` [1:N] - 一个菜单可以对应多个报餐记录

### 4. 场地表 (venues) - 场地管理
**作用**: 管理场地基本信息

**关联关系**:
- `users` [N:1] - 通过 `managerId` 关联管理员
- `reservations` [1:N] - 一个场地可以有多个预约

### 5. 餐桌表 (dining_tables) - 用餐管理
**作用**: 管理餐桌信息和状态

**关联关系**:
- `dining_verifications` [1:N] - 一个餐桌可以有多个验证记录

## 📋 表字段关系详情

### 用户表字段关系
```sql
users:
├── _id (主键)
├── departmentId → departments._id (外键)
├── openid (唯一索引)
├── phoneNumber (唯一索引)
├── role (枚举: user, dept_admin, sys_admin, verifier)
└── status (枚举: active, inactive)
```

### 报餐记录表字段关系
```sql
dining_orders:
├── _id (主键)
├── menuId → menus._id (外键)
├── deptId → departments._id (外键)
├── registrantId → users._id (外键)
├── confirmedBy → users._id (外键)
└── memberIds (JSON数组，存储用户ID)
```

### 场地预约表字段关系
```sql
reservations:
├── _id (主键)
├── venueId → venues._id (外键)
├── userId → users._id (外键)
├── approvedBy → users._id (外键)
└── participants (JSON数组，存储参与人员)
```

## 🔄 数据流转关系

### 报餐流程
```
1. 用户登录 (users) → 获取令牌 (user_tokens)
2. 查看菜单 (menus) → 选择菜品
3. 提交报餐 (dining_orders) → 关联菜单和部门
4. 用餐验证 (dining_verifications) → 关联餐桌和订单
```

### 预约流程
```
1. 用户登录 (users) → 获取令牌 (user_tokens)
2. 查看场地 (venues) → 选择可用场地
3. 提交预约 (reservations) → 关联场地和用户
4. 审核预约 → 更新预约状态
```

### 特殊预约流程
```
1. 用户登录 (users) → 获取令牌 (user_tokens)
2. 提交特殊预约 (special_reservations) → 关联用户和部门
3. 审核预约 → 更新预约状态
4. 用餐验证 (dining_verifications) → 关联餐桌
```

## 📊 索引关系

### 主要索引
```sql
-- 用户表索引
users:
├── PRIMARY KEY (_id)
├── UNIQUE KEY (openid)
├── UNIQUE KEY (phoneNumber)
├── INDEX (departmentId)
├── INDEX (role)
└── INDEX (status)

-- 报餐记录表索引
dining_orders:
├── PRIMARY KEY (_id)
├── INDEX (menuId)
├── INDEX (registrantId)
├── INDEX (diningDate)
├── INDEX (mealType)
└── INDEX (status)

-- 场地预约表索引
reservations:
├── PRIMARY KEY (_id)
├── INDEX (venueId)
├── INDEX (userId)
├── INDEX (reservationDate)
├── UNIQUE KEY (venueId, reservationDate, startTime, endTime)
└── INDEX (status)
```

## 🔒 外键约束

### 级联删除规则
```sql
-- 用户删除时
users → user_tokens (CASCADE)
users → dining_orders (CASCADE)
users → special_reservations (SET NULL)
users → reservations (CASCADE)
users → dining_verifications (CASCADE)
users → system_announcements (CASCADE)
users → activity_logs (SET NULL)
users → file_uploads (CASCADE)

-- 部门删除时
departments → users (SET NULL)
departments → dining_orders (SET NULL)
departments → special_reservations (SET NULL)

-- 菜单删除时
menus → dining_orders (SET NULL)

-- 场地删除时
venues → reservations (CASCADE)

-- 餐桌删除时
dining_tables → dining_verifications (CASCADE)
```

## 📈 查询优化建议

### 常用查询模式
```sql
-- 用户信息查询
SELECT u.*, d.name as department_name 
FROM users u 
LEFT JOIN departments d ON u.departmentId = d._id 
WHERE u.phoneNumber = ?;

-- 报餐记录查询
SELECT do.*, m.publishDate, m.mealType, u.nickName as registrant_name
FROM dining_orders do
LEFT JOIN menus m ON do.menuId = m._id
LEFT JOIN users u ON do.registrantId = u._id
WHERE do.diningDate = ?;

-- 场地预约查询
SELECT r.*, v.name as venue_name, v.type as venue_type
FROM reservations r
LEFT JOIN venues v ON r.venueId = v._id
WHERE r.userId = ?;
```

### 性能优化索引
```sql
-- 复合索引优化
CREATE INDEX idx_user_dept_role ON users(departmentId, role, status);
CREATE INDEX idx_dining_date_meal ON dining_orders(diningDate, mealType, status);
CREATE INDEX idx_reservation_date_venue ON reservations(reservationDate, venueId, status);
CREATE INDEX idx_verification_date_meal ON dining_verifications(diningDate, mealType, status);
```

---

**文档版本**: v1.4.0  
**最后更新**: 2025年1月  
**维护团队**: 湖北省地质局第三地质大队
