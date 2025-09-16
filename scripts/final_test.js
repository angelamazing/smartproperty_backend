const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMealTypeFiltering() {
  console.log('🧪 最终测试：餐次类型筛选功能\n');
  
  try {
    // 测试1: 晚餐筛选
    console.log('1️⃣ 测试晚餐筛选 (mealType=dinner)');
    const dinnerResponse = await axios.get(`${BASE_URL}/api/admin/dishes?mealType=dinner&pageSize=10`);
    const dinnerDishes = dinnerResponse.data.data.list;
    
    console.log(`   返回 ${dinnerDishes.length} 个菜品`);
    let validDinnerCount = 0;
    dinnerDishes.forEach(dish => {
      const hasDinner = dish.meal_types.includes('dinner');
      if (hasDinner) {
        validDinnerCount++;
      }
      console.log(`   - ${dish.name}: ${JSON.stringify(dish.meal_types)} ${hasDinner ? '✅' : '❌'}`);
    });
    console.log(`   筛选准确率: ${validDinnerCount}/${dinnerDishes.length} (${((validDinnerCount/dinnerDishes.length)*100).toFixed(1)}%)\n`);
    
    // 测试2: 早餐筛选
    console.log('2️⃣ 测试早餐筛选 (mealType=breakfast)');
    const breakfastResponse = await axios.get(`${BASE_URL}/api/admin/dishes?mealType=breakfast&pageSize=10`);
    const breakfastDishes = breakfastResponse.data.data.list;
    
    console.log(`   返回 ${breakfastDishes.length} 个菜品`);
    let validBreakfastCount = 0;
    breakfastDishes.forEach(dish => {
      const hasBreakfast = dish.meal_types.includes('breakfast');
      if (hasBreakfast) {
        validBreakfastCount++;
      }
      console.log(`   - ${dish.name}: ${JSON.stringify(dish.meal_types)} ${hasBreakfast ? '✅' : '❌'}`);
    });
    console.log(`   筛选准确率: ${validBreakfastCount}/${breakfastDishes.length} (${((validBreakfastCount/breakfastDishes.length)*100).toFixed(1)}%)\n`);
    
    // 测试3: 推荐菜品筛选
    console.log('3️⃣ 测试推荐菜品筛选 (isRecommended=true)');
    const recommendedResponse = await axios.get(`${BASE_URL}/api/admin/dishes?isRecommended=true&pageSize=10`);
    const recommendedDishes = recommendedResponse.data.data.list;
    
    console.log(`   返回 ${recommendedDishes.length} 个菜品`);
    let validRecommendedCount = 0;
    recommendedDishes.forEach(dish => {
      const isRecommended = dish.isRecommended === 1;
      if (isRecommended) {
        validRecommendedCount++;
      }
      console.log(`   - ${dish.name}: 推荐状态=${dish.isRecommended} ${isRecommended ? '✅' : '❌'}`);
    });
    console.log(`   筛选准确率: ${validRecommendedCount}/${recommendedDishes.length} (${((validRecommendedCount/recommendedDishes.length)*100).toFixed(1)}%)\n`);
    
    // 测试4: 组合筛选
    console.log('4️⃣ 测试组合筛选 (mealType=dinner + isRecommended=true)');
    const combinedResponse = await axios.get(`${BASE_URL}/api/admin/dishes?mealType=dinner&isRecommended=true&pageSize=10`);
    const combinedDishes = combinedResponse.data.data.list;
    
    console.log(`   返回 ${combinedDishes.length} 个菜品`);
    let validCombinedCount = 0;
    combinedDishes.forEach(dish => {
      const hasDinner = dish.meal_types.includes('dinner');
      const isRecommended = dish.isRecommended === 1;
      const isValid = hasDinner && isRecommended;
      if (isValid) {
        validCombinedCount++;
      }
      console.log(`   - ${dish.name}: 晚餐=${hasDinner}, 推荐=${isRecommended} ${isValid ? '✅' : '❌'}`);
    });
    console.log(`   筛选准确率: ${validCombinedCount}/${combinedDishes.length} (${((validCombinedCount/combinedDishes.length)*100).toFixed(1)}%)\n`);
    
    // 测试5: 无筛选条件（对照组）
    console.log('5️⃣ 对照组：无筛选条件');
    const allResponse = await axios.get(`${BASE_URL}/api/admin/dishes?pageSize=10`);
    const allDishes = allResponse.data.data.list;
    console.log(`   返回 ${allDishes.length} 个菜品（所有菜品）\n`);
    
    // 总结
    console.log('📊 测试总结:');
    console.log(`   晚餐筛选: ${validDinnerCount === dinnerDishes.length ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   早餐筛选: ${validBreakfastCount === breakfastDishes.length ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   推荐筛选: ${validRecommendedCount === recommendedDishes.length ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   组合筛选: ${validCombinedCount === combinedDishes.length ? '✅ 通过' : '❌ 失败'}`);
    
    const allTestsPassed = 
      validDinnerCount === dinnerDishes.length &&
      validBreakfastCount === breakfastDishes.length &&
      validRecommendedCount === recommendedDishes.length &&
      validCombinedCount === combinedDishes.length;
    
    console.log(`\n🎯 整体结果: ${allTestsPassed ? '✅ 所有测试通过！筛选功能已修复' : '❌ 部分测试失败，需要进一步检查'}`);
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testMealTypeFiltering();
