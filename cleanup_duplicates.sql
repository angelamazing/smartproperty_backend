-- 删除重复的报餐记录
-- 保留最早的记录，删除其他重复记录

-- 查看重复记录
SELECT _id, registrantName, memberIds, createTime, status 
FROM dining_orders 
WHERE diningDate = '2025-09-11' AND mealType = 'lunch' 
ORDER BY createTime;

-- 删除重复记录（保留最早的）
DELETE FROM dining_orders 
WHERE diningDate = '2025-09-11' 
AND mealType = 'lunch' 
AND _id NOT IN (
    SELECT _id FROM (
        SELECT _id FROM dining_orders 
        WHERE diningDate = '2025-09-11' AND mealType = 'lunch' 
        ORDER BY createTime 
        LIMIT 1
    ) AS keep_record
);

-- 验证删除结果
SELECT COUNT(*) as remaining_records 
FROM dining_orders 
WHERE diningDate = '2025-09-11' AND mealType = 'lunch';
