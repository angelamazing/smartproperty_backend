const axios = require('axios');

async function debugRequest() {
  try {
    console.log('发送请求到 /api/admin/dishes?mealType=dinner...');
    
    const response = await axios.get('http://localhost:3000/api/admin/dishes?mealType=dinner&page=1&pageSize=3');
    
    console.log('响应状态:', response.status);
    console.log('返回的菜品数量:', response.data.data.list.length);
    console.log('菜品名称:');
    response.data.data.list.forEach((dish, index) => {
      console.log(`  ${index + 1}. ${dish.name} - ${JSON.stringify(dish.meal_types)}`);
    });
    
  } catch (error) {
    console.error('请求失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

debugRequest();
