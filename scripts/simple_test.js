const axios = require('axios');

async function simpleTest() {
  try {
    console.log('测试晚餐筛选...');
    const response = await axios.get('http://localhost:3000/api/admin/dishes?mealType=dinner&page=1&pageSize=5');
    
    console.log('返回的菜品数量:', response.data.data.list.length);
    console.log('菜品列表:');
    
    response.data.data.list.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name} - meal_types: ${JSON.stringify(dish.meal_types)}`);
      console.log(`   包含dinner: ${dish.meal_types.includes('dinner')}`);
    });
    
    // 测试没有参数的情况
    console.log('\n测试无筛选条件...');
    const allResponse = await axios.get('http://localhost:3000/api/admin/dishes?page=1&pageSize=5');
    console.log('无筛选时返回的菜品数量:', allResponse.data.data.list.length);
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

simpleTest();
