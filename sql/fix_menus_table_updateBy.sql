-- 修复menus表缺失updateBy字段的问题
-- 执行日期: 2025-09-16

-- 检查updateBy字段是否存在
-- 如果不存在则添加该字段

-- 添加updateBy字段（如果不存在）
ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS updateBy VARCHAR(36) COMMENT '更新人' AFTER updateTime;

-- 添加索引（如果不存在）
-- 注意：MySQL的ALTER TABLE ADD INDEX不支持IF NOT EXISTS，需要先检查
-- 这里先尝试添加，如果已存在会报错但不会影响功能

-- 为updateBy字段添加索引
-- ALTER TABLE menus ADD INDEX idx_update_by (updateBy);

-- 添加外键约束（如果不存在）
-- ALTER TABLE menus ADD CONSTRAINT IF NOT EXISTS fk_menus_update_by 
-- FOREIGN KEY (updateBy) REFERENCES users(_id) ON DELETE SET NULL;

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'menus' 
  AND COLUMN_NAME = 'updateBy';
