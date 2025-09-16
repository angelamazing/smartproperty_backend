-- 为菜品表添加餐次类型字段
-- 执行前请备份数据库

-- 添加餐次类型字段
ALTER TABLE `dishes` 
ADD COLUMN `meal_types` JSON COMMENT '适用餐次类型，数组格式：["breakfast", "lunch", "dinner"]' AFTER `is_recommended`;

-- 添加索引以提高查询性能
ALTER TABLE `dishes` 
ADD INDEX `idx_meal_types` ((CAST(`meal_types` AS CHAR(255) ARRAY)));

-- 为现有菜品设置默认餐次类型（所有餐次都适用）
UPDATE `dishes` 
SET `meal_types` = JSON_ARRAY('breakfast', 'lunch', 'dinner') 
WHERE `meal_types` IS NULL;

-- 添加注释说明
ALTER TABLE `dishes` 
MODIFY COLUMN `meal_types` JSON COMMENT '适用餐次类型，数组格式：["breakfast", "lunch", "dinner"]，默认为所有餐次';

-- 验证数据
SELECT 
    id, 
    name, 
    meal_types,
    JSON_LENGTH(meal_types) as meal_count
FROM dishes 
LIMIT 10;
