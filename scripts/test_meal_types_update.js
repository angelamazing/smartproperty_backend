const axios = require('axios');

async function testMealTypesUpdate() {
  try {
    console.log('🚀 开始测试 mealTypes 更新功能...\n');

    // 1. 先获取一个菜品
    console.log('1. 获取菜品列表...');
    const dishesResponse = await axios.get('http://localhost:3000/api/admin/dishes?page=1&pageSize=1');
    console.log('✅ 获取菜品成功');
    
    if (dishesResponse.data.data.list.length === 0) {
      console.log('❌ 没有找到菜品，无法测试');
      return;
    }

    const dish = dishesResponse.data.data.list[0];
    console.log('📋 当前菜品信息:');
    console.log(`   ID: ${dish._id}`);
    console.log(`   名称: ${dish.name}`);
    console.log(`   当前 meal_types: ${JSON.stringify(dish.meal_types)}`);

    // 2. 更新 mealTypes
    console.log('\n2. 更新 mealTypes...');
    const updateData = {
      name: dish.name,
      description: dish.description,
      price: dish.price,
      categoryId: dish.categoryId,
      calories: dish.calories,
      protein: dish.protein,
      fat: dish.fat,
      carbohydrate: dish.carbohydrate,
      isRecommended: dish.isRecommended,
      status: dish.status,
      tags: dish.tags,
      mealTypes: ['breakfast', 'lunch'] // 测试更新为早餐和午餐
    };

    console.log('📝 更新数据:');
    console.log(`   mealTypes: ${JSON.stringify(updateData.mealTypes)}`);

    const updateResponse = await axios.put(
      `http://localhost:3000/api/admin/dishes/${dish._id}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer your-token-here' // 这里需要真实的token
        }
      }
    );

    console.log('✅ 更新请求发送成功');
    console.log('📊 更新响应:', updateResponse.data);

    // 3. 验证更新结果
    console.log('\n3. 验证更新结果...');
    const verifyResponse = await axios.get(`http://localhost:3000/api/admin/dishes/${dish._id}`);
    const updatedDish = verifyResponse.data.data;
    
    console.log('📋 更新后的菜品信息:');
    console.log(`   meal_types: ${JSON.stringify(updatedDish.meal_types)}`);
    
    if (JSON.stringify(updatedDish.meal_types) === JSON.stringify(['breakfast', 'lunch'])) {
      console.log('✅ mealTypes 更新成功！');
    } else {
      console.log('❌ mealTypes 更新失败！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 提示: 需要先登录获取有效的认证token');
    }
  }
}

// 运行测试
testMealTypesUpdate();
