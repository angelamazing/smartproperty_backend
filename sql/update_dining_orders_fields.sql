-- 为dining_orders表添加用户相关字段
ALTER TABLE dining_orders 
ADD COLUMN userId VARCHAR(36) COMMENT '用户ID';

ALTER TABLE dining_orders 
ADD COLUMN userName VARCHAR(50) COMMENT '用户姓名';

-- 添加外键约束
ALTER TABLE dining_orders 
ADD CONSTRAINT fk_dining_orders_user_id 
FOREIGN KEY (userId) REFERENCES users(_id) ON DELETE CASCADE;

-- 更新现有数据，将diningStatus设置为'ordered'（如果为NULL）
UPDATE dining_orders 
SET diningStatus = 'ordered' 
WHERE diningStatus IS NULL;
