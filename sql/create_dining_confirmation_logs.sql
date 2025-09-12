-- 创建就餐确认日志表
-- 用于记录用户确认就餐的详细日志

CREATE TABLE IF NOT EXISTS dining_confirmation_logs (
  _id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  orderId VARCHAR(36) NOT NULL COMMENT '订单ID',
  userId VARCHAR(36) NOT NULL COMMENT '用户ID',
  userName VARCHAR(50) NOT NULL COMMENT '用户姓名',
  confirmationType ENUM('manual', 'qr', 'admin') NOT NULL COMMENT '确认类型：manual-手动确认，qr-扫码确认，admin-管理员代确认',
  confirmationTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '确认时间',
  remark TEXT COMMENT '备注信息',
  confirmedBy VARCHAR(36) COMMENT '确认人ID（管理员代确认时使用）',
  createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_order_id (orderId),
  INDEX idx_user_id (userId),
  INDEX idx_confirmation_time (confirmationTime),
  INDEX idx_confirmation_type (confirmationType),
  
  FOREIGN KEY (orderId) REFERENCES dining_orders(_id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE,
  FOREIGN KEY (confirmedBy) REFERENCES users(_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='就餐确认日志表';

-- 为dining_orders表添加确认就餐相关字段（如果不存在）
-- 这些字段在扫码就餐功能中已经添加，这里确保存在

-- 添加实际就餐时间字段
ALTER TABLE dining_orders 
ADD COLUMN IF NOT EXISTS actualDiningTime TIMESTAMP NULL COMMENT '实际就餐时间';

-- 添加就餐状态字段
ALTER TABLE dining_orders 
ADD COLUMN IF NOT EXISTS diningStatus ENUM('ordered', 'dined', 'cancelled') DEFAULT 'ordered' COMMENT '就餐状态：ordered-已报餐，dined-已就餐，cancelled-已取消';

-- 添加用户ID字段（如果不存在）
ALTER TABLE dining_orders 
ADD COLUMN IF NOT EXISTS userId VARCHAR(36) COMMENT '用户ID';

-- 添加用户姓名字段（如果不存在）
ALTER TABLE dining_orders 
ADD COLUMN IF NOT EXISTS userName VARCHAR(50) COMMENT '用户姓名';

-- 添加外键约束（如果不存在）
ALTER TABLE dining_orders 
ADD CONSTRAINT IF NOT EXISTS fk_dining_orders_user_id 
FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE;

-- 添加索引（检查是否存在）
-- 注意：MySQL的ALTER TABLE ADD INDEX不支持IF NOT EXISTS，需要先检查
-- 这些索引会在字段创建时自动创建，或者手动添加

-- 更新现有数据，将diningStatus设置为'ordered'（如果为NULL）
UPDATE dining_orders 
SET diningStatus = 'ordered' 
WHERE diningStatus IS NULL;
