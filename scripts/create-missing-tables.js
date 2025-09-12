const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建缺失的菜品相关表
 */
async function createMissingTables() {
  const connection = await mysql.createConnection(config.database);
  
  try {
    console.log('开始创建缺失的菜品相关表...');
    
    // 1. 创建菜品分类表
    console.log('创建菜品分类表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dish_categories (
        _id VARCHAR(36) PRIMARY KEY COMMENT '分类ID',
        name VARCHAR(100) NOT NULL COMMENT '分类名称',
        description TEXT COMMENT '分类描述',
        icon VARCHAR(100) COMMENT '分类图标',
        color VARCHAR(20) COMMENT '分类颜色',
        sort INT DEFAULT 0 COMMENT '排序',
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active' COMMENT '状态',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createBy VARCHAR(36) COMMENT '创建人',
        
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_sort (sort),
        INDEX idx_create_time (createTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜品分类表'
    `);
    console.log('✅ 菜品分类表创建成功');
    
    // 2. 创建菜品表
    console.log('创建菜品表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dishes (
        _id VARCHAR(36) PRIMARY KEY COMMENT '菜品ID',
        name VARCHAR(100) NOT NULL COMMENT '菜品名称',
        categoryId VARCHAR(36) COMMENT '分类ID',
        description TEXT COMMENT '菜品描述',
        price DECIMAL(10,2) DEFAULT 0.00 COMMENT '价格',
        image TEXT COMMENT '菜品图片',
        calories INT COMMENT '卡路里',
        protein DECIMAL(5,2) COMMENT '蛋白质(克)',
        fat DECIMAL(5,2) COMMENT '脂肪(克)',
        carbohydrate DECIMAL(5,2) COMMENT '碳水化合物(克)',
        tags JSON COMMENT '标签',
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active' COMMENT '状态',
        isRecommended BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createBy VARCHAR(36) COMMENT '创建人',
        
        INDEX idx_name (name),
        INDEX idx_category (categoryId),
        INDEX idx_status (status),
        INDEX idx_price (price),
        INDEX idx_create_time (createTime),
        FOREIGN KEY (categoryId) REFERENCES dish_categories(_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜品表'
    `);
    console.log('✅ 菜品表创建成功');
    
    // 3. 创建菜单菜品关联表
    console.log('创建菜单菜品关联表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menu_dishes (
        _id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
        menuId VARCHAR(36) NOT NULL COMMENT '菜单ID',
        dishId VARCHAR(36) NOT NULL COMMENT '菜品ID',
        price DECIMAL(10,2) DEFAULT 0.00 COMMENT '价格',
        sort INT DEFAULT 0 COMMENT '排序',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        
        INDEX idx_menu_id (menuId),
        INDEX idx_dish_id (dishId),
        FOREIGN KEY (menuId) REFERENCES menus(_id) ON DELETE CASCADE,
        FOREIGN KEY (dishId) REFERENCES dishes(_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单菜品关联表'
    `);
    console.log('✅ 菜单菜品关联表创建成功');
    
    // 4. 创建营养模板表
    console.log('创建营养模板表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS nutrition_templates (
        _id VARCHAR(36) PRIMARY KEY COMMENT '模板ID',
        name VARCHAR(100) NOT NULL COMMENT '模板名称',
        description TEXT COMMENT '模板描述',
        calories INT COMMENT '目标卡路里',
        protein DECIMAL(5,2) COMMENT '目标蛋白质(克)',
        fat DECIMAL(5,2) COMMENT '目标脂肪(克)',
        carbohydrate DECIMAL(5,2) COMMENT '目标碳水化合物(克)',
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active' COMMENT '状态',
        createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createBy VARCHAR(36) COMMENT '创建人',
        
        INDEX idx_name (name),
        INDEX idx_status (status),
        INDEX idx_create_time (createTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='营养模板表'
    `);
    console.log('✅ 营养模板表创建成功');
    
    // 5. 插入示例数据
    console.log('插入示例数据...');
    
    // 菜品分类示例数据
    const categories = [
      { _id: uuidv4(), name: '主食', description: '米饭、面条等主食类', icon: '🍚', color: '#FF6B6B', sort: 1 },
      { _id: uuidv4(), name: '荤菜', description: '肉类菜品', icon: '🥩', color: '#4ECDC4', sort: 2 },
      { _id: uuidv4(), name: '素菜', description: '蔬菜类菜品', icon: '🥬', color: '#45B7D1', sort: 3 },
      { _id: uuidv4(), name: '汤类', description: '各种汤品', icon: '🥣', color: '#96CEB4', sort: 4 },
      { _id: uuidv4(), name: '饮品', description: '饮料、果汁等', icon: '🥤', color: '#FFEAA7', sort: 5 }
    ];
    
    for (const category of categories) {
      await connection.execute(
        'INSERT IGNORE INTO dish_categories (_id, name, description, icon, color, sort, status, createTime) VALUES (?, ?, ?, ?, ?, ?, "active", NOW())',
        [category._id, category.name, category.description, category.icon, category.color, category.sort]
      );
    }
    console.log('✅ 菜品分类示例数据插入成功');
    
    // 菜品示例数据
    const dishes = [
      { _id: uuidv4(), name: '宫保鸡丁', categoryId: categories[1]._id, description: '经典川菜，鸡肉配花生米', price: 28.00, calories: 350, protein: 25.0, fat: 15.0, carbohydrate: 20.0 },
      { _id: uuidv4(), name: '麻婆豆腐', categoryId: categories[2]._id, description: '嫩滑豆腐配麻辣肉末', price: 18.00, calories: 200, protein: 12.0, fat: 8.0, carbohydrate: 15.0 },
      { _id: uuidv4(), name: '白米饭', categoryId: categories[0]._id, description: '香软白米饭', price: 3.00, calories: 150, protein: 3.0, fat: 0.5, carbohydrate: 30.0 },
      { _id: uuidv4(), name: '番茄蛋汤', categoryId: categories[3]._id, description: '酸甜可口的番茄蛋汤', price: 8.00, calories: 80, protein: 6.0, fat: 4.0, carbohydrate: 8.0 }
    ];
    
    for (const dish of dishes) {
      await connection.execute(
        'INSERT IGNORE INTO dishes (_id, name, categoryId, description, price, calories, protein, fat, carbohydrate, status, createTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active", NOW())',
        [dish._id, dish.name, dish.categoryId, dish.description, dish.price, dish.calories, dish.protein, dish.fat, dish.carbohydrate]
      );
    }
    console.log('✅ 菜品示例数据插入成功');
    
    // 营养模板示例数据
    const templates = [
      { _id: uuidv4(), name: '标准餐', description: '标准营养配比', calories: 800, protein: 40.0, fat: 25.0, carbohydrate: 80.0 },
      { _id: uuidv4(), name: '低脂餐', description: '低脂肪高蛋白', calories: 600, protein: 50.0, fat: 15.0, carbohydrate: 60.0 },
      { _id: uuidv4(), name: '高蛋白餐', description: '高蛋白增肌餐', calories: 1000, protein: 80.0, fat: 30.0, carbohydrate: 70.0 }
    ];
    
    for (const template of templates) {
      await connection.execute(
        'INSERT IGNORE INTO nutrition_templates (_id, name, description, calories, protein, fat, carbohydrate, status, createTime) VALUES (?, ?, ?, ?, ?, ?, ?, "active", NOW())',
        [template._id, template.name, template.description, template.calories, template.protein, template.fat, template.carbohydrate]
      );
    }
    console.log('✅ 营养模板示例数据插入成功');
    
    console.log('🎉 所有缺失的表创建完成！');
    
  } catch (error) {
    console.error('创建表失败:', error.message);
  } finally {
    await connection.end();
  }
}

// 运行脚本
createMissingTables();
