-- 为dining_orders表添加userId字段
ALTER TABLE dining_orders 
ADD COLUMN userId VARCHAR(36) COMMENT '用户ID';
