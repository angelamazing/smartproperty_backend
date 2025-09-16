const axios = require('axios');

async function testApiWithAuth() {
  try {
    console.log('🚀 开始测试完整的API更新流程...\n');

    // 1. 先登录获取token
    console.log('1. 登录获取认证token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/phone-password-login', {
      phoneNumber: '13800002007',
      password: '123456'
    });

    if (!loginResponse.data.success) {
      console.log('❌ 登录失败:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，获取到token');

    // 2. 获取菜品列表
    console.log('\n2. 获取菜品列表...');
    const dishesResponse = await axios.get('http://localhost:3000/api/admin/dishes?page=1&pageSize=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!dishesResponse.data.success) {
      console.log('❌ 获取菜品列表失败:', dishesResponse.data.message);
      return;
    }

    const dish = dishesResponse.data.data.list[0];
    console.log('📋 当前菜品:');
    console.log(`   ID: ${dish._id}`);
    console.log(`   名称: ${dish.name}`);
    console.log(`   当前 meal_types: ${JSON.stringify(dish.meal_types)}`);

    // 3. 更新菜品
    console.log('\n3. 更新菜品 mealTypes...');
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
      mealTypes: ['breakfast', 'lunch', 'dinner'] // 测试更新为所有餐次
    };

    console.log('📝 更新数据:');
    console.log(`   mealTypes: ${JSON.stringify(updateData.mealTypes)}`);

    const updateResponse = await axios.put(
      `http://localhost:3000/api/admin/dishes/${dish._id}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!updateResponse.data.success) {
      console.log('❌ 更新菜品失败:', updateResponse.data.message);
      return;
    }

    console.log('✅ 更新请求成功');
    console.log('📊 更新响应:', updateResponse.data);

    // 4. 验证更新结果
    console.log('\n4. 验证更新结果...');
    const verifyResponse = await axios.get(`http://localhost:3000/api/admin/dishes/${dish._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!verifyResponse.data.success) {
      console.log('❌ 获取菜品详情失败:', verifyResponse.data.message);
      return;
    }

    const updatedDish = verifyResponse.data.data;
    console.log('📋 更新后的菜品:');
    console.log(`   meal_types: ${JSON.stringify(updatedDish.meal_types)}`);

    // 5. 验证结果
    console.log('\n5. 验证结果...');
    if (JSON.stringify(updatedDish.meal_types) === JSON.stringify(['breakfast', 'lunch', 'dinner'])) {
      console.log('✅ mealTypes 更新成功！');
    } else {
      console.log('❌ mealTypes 更新失败！');
      console.log(`   期望: ${JSON.stringify(['breakfast', 'lunch', 'dinner'])}`);
      console.log(`   实际: ${JSON.stringify(updatedDish.meal_types)}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 提示: 认证失败，请检查登录信息');
    }
  }
}

// 运行测试
testApiWithAuth();
