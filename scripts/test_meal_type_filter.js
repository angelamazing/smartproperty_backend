const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMealTypeFilter() {
  try {
    console.log('🧪 测试餐次类型筛选功能...\n');
    
    // 测试晚餐类型筛选
    console.log('1. 测试晚餐类型筛选 (mealType=dinner):');
    const dinnerResponse = await axios.get(`${BASE_URL}/api/admin/dishes?page=1&pageSize=10&mealType=dinner`);
    
    console.log('状态码:', dinnerResponse.status);
    console.log('返回数据:');
    console.log(JSON.stringify(dinnerResponse.data, null, 2));
    
    // 检查返回的菜品是否都包含晚餐类型
    const dinnerDishes = dinnerResponse.data.data.list;
    console.log('\n📊 晚餐菜品分析:');
    dinnerDishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name} - 餐次类型: ${JSON.stringify(dish.meal_types)}`);
      if (!dish.meal_types.includes('dinner')) {
        console.log('   ❌ 错误：此菜品不包含晚餐类型！');
      } else {
        console.log('   ✅ 正确：此菜品包含晚餐类型');
      }
    });
    
    console.log('\n' + '='.repeat(50));
    
    // 测试早餐类型筛选
    console.log('\n2. 测试早餐类型筛选 (mealType=breakfast):');
    const breakfastResponse = await axios.get(`${BASE_URL}/api/admin/dishes?page=1&pageSize=10&mealType=breakfast`);
    
    console.log('状态码:', breakfastResponse.status);
    console.log('返回数据:');
    console.log(JSON.stringify(breakfastResponse.data, null, 2));
    
    // 检查返回的菜品是否都包含早餐类型
    const breakfastDishes = breakfastResponse.data.data.list;
    console.log('\n📊 早餐菜品分析:');
    breakfastDishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name} - 餐次类型: ${JSON.stringify(dish.meal_types)}`);
      if (!dish.meal_types.includes('breakfast')) {
        console.log('   ❌ 错误：此菜品不包含早餐类型！');
      } else {
        console.log('   ✅ 正确：此菜品包含早餐类型');
      }
    });
    
    console.log('\n' + '='.repeat(50));
    
    // 测试午餐类型筛选
    console.log('\n3. 测试午餐类型筛选 (mealType=lunch):');
    const lunchResponse = await axios.get(`${BASE_URL}/api/admin/dishes?page=1&pageSize=10&mealType=lunch`);
    
    console.log('状态码:', lunchResponse.status);
    console.log('返回数据:');
    console.log(JSON.stringify(lunchResponse.data, null, 2));
    
    // 检查返回的菜品是否都包含午餐类型
    const lunchDishes = lunchResponse.data.data.list;
    console.log('\n📊 午餐菜品分析:');
    lunchDishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name} - 餐次类型: ${JSON.stringify(dish.meal_types)}`);
      if (!dish.meal_types.includes('lunch')) {
        console.log('   ❌ 错误：此菜品不包含午餐类型！');
      } else {
        console.log('   ✅ 正确：此菜品包含午餐类型');
      }
    });
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testMealTypeFilter();
