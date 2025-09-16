# 智慧物业管理系统 - 数据库快速使用指南

## 🚀 快速开始

### 1. 环境准备

确保已安装以下环境：
- **MySQL**: 8.0+
- **Node.js**: 16.0+
- **npm**: 8.0+

### 2. 数据库配置

编辑 `config/database.js` 文件，配置数据库连接信息：

```javascript
const config = {
  database: {
    host: 'localhost',        // 数据库主机
    port: 3306,              // 数据库端口
    user: 'root',            // 数据库用户名
    password: 'your_password', // 数据库密码
    database: 'smart_property', // 数据库名
    charset: 'utf8mb4',
    timezone: '+08:00'
  }
};
```

### 3. 初始化数据库

#### 方法一：使用优化脚本（推荐）
```bash
# 完整初始化
node scripts/database-init-optimized.js init

# 验证数据库结构
node scripts/database-init-optimized.js verify
```

#### 方法二：使用原有脚本
```bash
# 完整初始化
node scripts/initDatabase-complete.js init

# 验证数据库结构
node scripts/initDatabase-complete.js verify
```

### 4. 验证安装

```bash
# 检查服务状态
curl http://localhost:3000/health

# 测试数据库连接
curl http://localhost:3000/api/admin/system/status
```

## 📊 数据库结构概览

### 核心表 (4个)
- `users` - 用户信息表
- `departments` - 部门管理表
- `user_tokens` - 用户令牌表
- `verification_codes` - 验证码表

### 业务表 (6个)
- `menus` - 菜单管理表
- `dining_orders` - 报餐记录表
- `special_reservations` - 特殊预约表
- `venues` - 场地信息表
- `reservations` - 场地预约表
- `dining_tables` - 餐桌管理表

### 扩展表 (5个)
- `dining_verifications` - 用餐验证记录表
- `system_announcements` - 系统公告表
- `activity_logs` - 活动日志表
- `file_uploads` - 文件上传表
- `system_configs` - 系统配置表

**总计**: 15个表

## 🔧 常用操作

### 数据库管理

```bash
# 初始化数据库
node scripts/database-init-optimized.js init

# 重置数据库（删除所有数据）
node scripts/database-init-optimized.js reset

# 验证数据库结构
node scripts/database-init-optimized.js verify

# 清理数据库（删除所有表）
node scripts/database-init-optimized.js clean
```

### 数据查询示例

```sql
-- 查看所有表
SHOW TABLES;

-- 查看用户表结构
DESCRIBE users;

-- 查看部门数据
SELECT * FROM departments;

-- 查看场地数据
SELECT * FROM venues;

-- 查看系统配置
SELECT * FROM system_configs;
```

### 数据统计

```sql
-- 用户统计
SELECT 
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM users 
GROUP BY role;

-- 报餐统计
SELECT 
  DATE(diningDate) as date,
  mealType,
  COUNT(*) as order_count,
  SUM(memberCount) as total_people
FROM dining_orders 
WHERE status != 'cancelled'
GROUP BY DATE(diningDate), mealType
ORDER BY date DESC;

-- 场地预约统计
SELECT 
  v.name as venue_name,
  v.type as venue_type,
  COUNT(r._id) as reservation_count
FROM venues v
LEFT JOIN reservations r ON v._id = r.venueId
GROUP BY v._id, v.name, v.type;
```

## 🛠️ 维护操作

### 备份数据库

```bash
# 备份整个数据库
mysqldump -u root -p smart_property > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份特定表
mysqldump -u root -p smart_property users departments > users_backup.sql
```

### 恢复数据库

```bash
# 恢复整个数据库
mysql -u root -p smart_property < backup_20240101_120000.sql

# 恢复特定表
mysql -u root -p smart_property < users_backup.sql
```

### 清理过期数据

```sql
-- 清理过期的验证码
DELETE FROM verification_codes 
WHERE expireTime < NOW() AND status = 'unused';

-- 清理过期的用户令牌
DELETE FROM user_tokens 
WHERE expireTime < NOW();

-- 清理过期的活动日志（保留30天）
DELETE FROM activity_logs 
WHERE createTime < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 🔍 故障排除

### 常见问题

#### 1. 数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案**:
- 检查MySQL服务是否启动
- 验证数据库配置信息
- 确认防火墙设置

#### 2. 表不存在错误
```
Error: Table 'smart_property.users' doesn't exist
```

**解决方案**:
```bash
# 重新初始化数据库
node scripts/database-init-optimized.js init
```

#### 3. 外键约束错误
```
Error: Cannot add or update a child row: a foreign key constraint fails
```

**解决方案**:
- 检查数据完整性
- 确保关联表数据存在
- 按正确顺序插入数据

#### 4. 字符集问题
```
Error: Incorrect string value
```

**解决方案**:
- 确保数据库使用utf8mb4字符集
- 检查表字符集设置
- 验证数据编码

### 调试模式

```bash
# 启用详细日志
DEBUG=* node scripts/database-init-optimized.js init

# 查看MySQL错误日志
tail -f /var/log/mysql/error.log

# 检查数据库连接
mysql -u root -p -e "SHOW DATABASES;"
```

## 📈 性能优化

### 索引优化

```sql
-- 查看表索引
SHOW INDEX FROM users;

-- 分析查询性能
EXPLAIN SELECT * FROM users WHERE phoneNumber = '13800000001';

-- 添加复合索引
CREATE INDEX idx_user_dept_role ON users(departmentId, role, status);
```

### 查询优化

```sql
-- 使用LIMIT分页
SELECT * FROM dining_orders 
ORDER BY createTime DESC 
LIMIT 20 OFFSET 0;

-- 使用索引字段查询
SELECT * FROM users 
WHERE phoneNumber = '13800000001' 
AND status = 'active';

-- 避免SELECT *
SELECT id, name, phoneNumber FROM users 
WHERE departmentId = 'dept_id';
```

### 连接池配置

```javascript
// config/database.js
const config = {
  database: {
    // ... 其他配置
    connectionLimit: 20,        // 最大连接数
    queueLimit: 0,             // 队列限制
    waitForConnections: true,   // 等待连接
    acquireTimeout: 60000,     // 获取连接超时
    timeout: 60000,            // 查询超时
    reconnect: true            // 自动重连
  }
};
```

## 🔒 安全建议

### 数据库安全

1. **修改默认密码**
2. **限制数据库访问IP**
3. **定期备份数据**
4. **监控异常访问**

### 应用安全

1. **使用参数化查询**
2. **验证输入数据**
3. **限制数据库权限**
4. **记录操作日志**

## 📚 相关文档

- [数据库说明文档](./DATABASE_DOCUMENTATION.md) - 详细的数据库设计说明
- [部署指南](./DEPLOYMENT.md) - 完整的部署流程
- [API文档](./接口文档/00-接口文档索引.md) - API接口文档

## 🆘 技术支持

如遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查系统日志文件
3. 运行数据库验证脚本
4. 提供详细的错误信息

---

**文档版本**: v1.4.0  
**最后更新**: 2025年1月  
**维护团队**: 湖北省地质局第三地质大队
