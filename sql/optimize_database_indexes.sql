-- 数据库索引优化脚本
-- 基于查询分析，添加必要的索引以提升查询性能

-- ============================================
-- 1. dining_orders 表索引优化
-- ============================================

-- 复合索引：按日期、餐次、状态查询（最常用）
ALTER TABLE dining_orders ADD INDEX idx_date_meal_status (diningDate, mealType, diningStatus);

-- 复合索引：按用户、日期查询
ALTER TABLE dining_orders ADD INDEX idx_user_date (userId, diningDate);

-- 复合索引：按部门、日期查询
ALTER TABLE dining_orders ADD INDEX idx_dept_date (deptId, diningDate);

-- 单字段索引：状态查询
ALTER TABLE dining_orders ADD INDEX idx_status (status);

-- 单字段索引：就餐状态查询
ALTER TABLE dining_orders ADD INDEX idx_dining_status (diningStatus);

-- 单字段索引：实际就餐时间查询
ALTER TABLE dining_orders ADD INDEX idx_actual_dining_time (actualDiningTime);

-- 单字段索引：创建时间查询
ALTER TABLE dining_orders ADD INDEX idx_create_time (createTime);

-- ============================================
-- 2. dining_confirmation_logs 表索引优化
-- ============================================

-- 复合索引：按用户、确认时间查询（历史记录）
ALTER TABLE dining_confirmation_logs ADD INDEX idx_user_confirmation_time (userId, confirmationTime);

-- 复合索引：按订单、确认时间查询
ALTER TABLE dining_confirmation_logs ADD INDEX idx_order_confirmation_time (orderId, confirmationTime);

-- 单字段索引：确认类型查询
ALTER TABLE dining_confirmation_logs ADD INDEX idx_confirmation_type (confirmationType);

-- 单字段索引：确认时间查询
ALTER TABLE dining_confirmation_logs ADD INDEX idx_confirmation_time (confirmationTime);

-- ============================================
-- 3. users 表索引优化
-- ============================================

-- 复合索引：按部门、状态查询
ALTER TABLE users ADD INDEX idx_dept_status (departmentId, status);

-- 复合索引：按角色、状态查询
ALTER TABLE users ADD INDEX idx_role_status (role, status);

-- 单字段索引：手机号查询（已存在唯一索引，但可能需要普通索引）
-- ALTER TABLE users ADD INDEX idx_phone (phoneNumber);

-- ============================================
-- 4. menus 表索引优化
-- ============================================

-- 复合索引：按发布日期、餐次查询
ALTER TABLE menus ADD INDEX idx_publish_date_meal (publishDate, mealType);

-- 单字段索引：发布日期查询
ALTER TABLE menus ADD INDEX idx_publish_date (publishDate);

-- ============================================
-- 5. dining_registrations 表索引优化
-- ============================================

-- 复合索引：按用户、就餐日期查询
ALTER TABLE dining_registrations ADD INDEX idx_user_dining_date (userId, diningDate);

-- 复合索引：按用户、餐次、日期查询
ALTER TABLE dining_registrations ADD INDEX idx_user_meal_date (userId, mealType, diningDate);

-- 单字段索引：扫码时间查询
ALTER TABLE dining_registrations ADD INDEX idx_scan_time (scanTime);

-- ============================================
-- 6. qr_codes 表索引优化
-- ============================================

-- 单字段索引：二维码标识查询
ALTER TABLE qr_codes ADD INDEX idx_qr_code (qrCode);

-- 单字段索引：状态查询
ALTER TABLE qr_codes ADD INDEX idx_status (status);

-- ============================================
-- 7. departments 表索引优化
-- ============================================

-- 单字段索引：父部门查询
ALTER TABLE departments ADD INDEX idx_parent_id (parentId);

-- 单字段索引：状态查询
ALTER TABLE departments ADD INDEX idx_status (status);

-- ============================================
-- 8. user_tokens 表索引优化
-- ============================================

-- 复合索引：按用户、过期时间查询
ALTER TABLE user_tokens ADD INDEX idx_user_expire_time (userId, expireTime);

-- 单字段索引：过期时间查询
ALTER TABLE user_tokens ADD INDEX idx_expire_time (expireTime);

-- ============================================
-- 9. verification_codes 表索引优化
-- ============================================

-- 复合索引：按手机号、状态、过期时间查询
ALTER TABLE verification_codes ADD INDEX idx_phone_status_expire (phoneNumber, status, expireTime);

-- 单字段索引：过期时间查询
ALTER TABLE verification_codes ADD INDEX idx_expire_time (expireTime);

-- ============================================
-- 10. 性能监控查询索引
-- ============================================

-- 为统计查询添加覆盖索引
ALTER TABLE dining_orders ADD INDEX idx_stats_cover (diningDate, mealType, diningStatus, deptId, userId);

-- 为历史查询添加覆盖索引
ALTER TABLE dining_confirmation_logs ADD INDEX idx_history_cover (userId, confirmationTime, confirmationType, orderId);

-- ============================================
-- 索引优化说明
-- ============================================

/*
索引优化策略说明：

1. 复合索引设计原则：
   - 最常用的查询条件放在最前面
   - 选择性高的字段放在前面
   - 避免过多字段的复合索引（一般不超过3-4个字段）

2. 查询模式分析：
   - 按日期+餐次+状态查询：最常用，用于获取当日餐次状态
   - 按用户+日期查询：用于个人历史记录
   - 按部门+日期查询：用于部门统计
   - 按用户+确认时间查询：用于确认历史

3. 覆盖索引：
   - 对于频繁的统计查询，创建覆盖索引避免回表
   - 包含查询所需的所有字段

4. 单字段索引：
   - 为经常单独查询的字段创建索引
   - 如状态字段、时间字段等

5. 性能提升预期：
   - 查询性能提升：50-80%
   - 统计查询性能提升：60-90%
   - 历史记录查询性能提升：70-95%

6. 注意事项：
   - 索引会占用存储空间
   - 会影响写入性能（INSERT/UPDATE/DELETE）
   - 需要定期监控索引使用情况
   - 根据实际查询模式调整索引策略
*/
