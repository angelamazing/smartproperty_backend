const mysql = require('mysql2/promise');
const config = require('../config/database');

async function createTestDishes() {
  let connection;
  
  try {
    console.log('🚀 开始创建测试菜品数据...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 获取现有分类ID
    const [categories] = await connection.execute(`
      SELECT _id, name FROM dish_categories WHERE status = 'active' LIMIT 3
    `);
    
    if (categories.length === 0) {
      console.log('❌ 没有找到菜品分类，请先创建分类');
      return;
    }
    
    console.log('📋 找到分类:', categories.map(c => c.name).join(', '));
    
    // 创建测试菜品数据
    const testDishes = [
      {
        name: '小笼包',
        categoryId: categories[0]._id,
        description: '经典上海小笼包，皮薄馅大',
        price: 8.00,
        mealTypes: ['breakfast'],
        calories: 200,
        protein: 8.5,
        fat: 5.2,
        carbohydrate: 25.0,
        isRecommended: true
      },
      {
        name: '宫保鸡丁',
        categoryId: categories[0]._id,
        description: '经典川菜，麻辣鲜香',
        price: 25.50,
        mealTypes: ['lunch', 'dinner'],
        calories: 350,
        protein: 25.5,
        fat: 15.2,
        carbohydrate: 18.7,
        isRecommended: true
      },
      {
        name: '红烧肉',
        categoryId: categories[0]._id,
        description: '肥瘦相间的红烧肉，入口即化',
        price: 28.00,
        mealTypes: ['lunch', 'dinner'],
        calories: 450,
        protein: 20.0,
        fat: 35.0,
        carbohydrate: 12.0,
        isRecommended: false
      },
      {
        name: '白粥',
        categoryId: categories[1] ? categories[1]._id : categories[0]._id,
        description: '清淡养胃的白粥',
        price: 3.00,
        mealTypes: ['breakfast'],
        calories: 80,
        protein: 2.0,
        fat: 0.5,
        carbohydrate: 18.0,
        isRecommended: false
      },
      {
        name: '蛋炒饭',
        categoryId: categories[1] ? categories[1]._id : categories[0]._id,
        description: '粒粒分明的蛋炒饭',
        price: 12.00,
        mealTypes: ['breakfast', 'lunch', 'dinner'],
        calories: 300,
        protein: 12.0,
        fat: 8.0,
        carbohydrate: 45.0,
        isRecommended: true
      },
      {
        name: '糖醋排骨',
        categoryId: categories[0]._id,
        description: '酸甜可口的糖醋排骨',
        price: 32.00,
        mealTypes: ['lunch', 'dinner'],
        calories: 400,
        protein: 22.0,
        fat: 25.0,
        carbohydrate: 20.0,
        isRecommended: true
      }
    ];
    
    console.log('📝 开始插入测试菜品...');
    
    for (const dish of testDishes) {
      const dishId = 'test-dish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      await connection.execute(`
        INSERT INTO dishes (
          _id, name, categoryId, description, price, 
          meal_types, status, isRecommended, calories, protein, fat, carbohydrate,
          createTime, createBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      `, [
        dishId,
        dish.name,
        dish.categoryId,
        dish.description,
        dish.price,
        JSON.stringify(dish.mealTypes),
        'active',
        dish.isRecommended ? 1 : 0,
        dish.calories,
        dish.protein,
        dish.fat,
        dish.carbohydrate,
        'test-admin'
      ]);
      
      console.log(`✅ 创建菜品: ${dish.name} (${dish.mealTypes.join(', ')})`);
    }
    
    // 验证创建结果
    console.log('\n📊 验证创建结果...');
    
    const [breakfastDishes] = await connection.execute(`
      SELECT name, meal_types FROM dishes 
      WHERE status = 'active' 
      AND JSON_CONTAINS(meal_types, '"breakfast"')
      ORDER BY createTime DESC
    `);
    
    const [lunchDishes] = await connection.execute(`
      SELECT name, meal_types FROM dishes 
      WHERE status = 'active' 
      AND JSON_CONTAINS(meal_types, '"lunch"')
      ORDER BY createTime DESC
    `);
    
    const [dinnerDishes] = await connection.execute(`
      SELECT name, meal_types FROM dishes 
      WHERE status = 'active' 
      AND JSON_CONTAINS(meal_types, '"dinner"')
      ORDER BY createTime DESC
    `);
    
    console.log(`\n🍽️ 早餐菜品 (${breakfastDishes.length} 个):`);
    breakfastDishes.forEach(dish => {
      console.log(`  - ${dish.name}`);
    });
    
    console.log(`\n🍽️ 午餐菜品 (${lunchDishes.length} 个):`);
    lunchDishes.forEach(dish => {
      console.log(`  - ${dish.name}`);
    });
    
    console.log(`\n🍽️ 晚餐菜品 (${dinnerDishes.length} 个):`);
    dinnerDishes.forEach(dish => {
      console.log(`  - ${dish.name}`);
    });
    
    console.log('\n🎉 测试菜品数据创建完成！');
    
  } catch (error) {
    console.error('❌ 创建测试菜品失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行创建
createTestDishes();
