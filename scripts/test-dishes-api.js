const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

async function testDishesAPI() {
  const connection = await mysql.createConnection(config.database);
  
  try {
    console.log('=== 测试菜品API ===');
    
    // 测试获取菜品列表
    console.log('\n1. 测试获取菜品列表...');
    try {
      const result = await adminService.getDishes(connection, {
        page: 1,
        pageSize: 12,
        filters: {}
      });
      console.log('✅ 获取菜品列表成功:');
      console.log(`   - 总数: ${result.total}`);
      console.log(`   - 当前页: ${result.page}`);
      console.log(`   - 每页大小: ${result.pageSize}`);
      console.log(`   - 菜品数量: ${result.list.length}`);
      
      if (result.list.length > 0) {
        console.log('   - 第一个菜品:', result.list[0]);
      }
    } catch (error) {
      console.error('❌ 获取菜品列表失败:', error.message);
    }
    
    // 测试获取菜品分类
    console.log('\n2. 测试获取菜品分类...');
    try {
      const categories = await adminService.getDishCategories(connection);
      console.log('✅ 获取菜品分类成功:');
      console.log(`   - 分类数量: ${categories.length}`);
      if (categories.length > 0) {
        console.log('   - 第一个分类:', categories[0]);
      }
    } catch (error) {
      console.error('❌ 获取菜品分类失败:', error.message);
    }
    
    // 测试获取营养模板
    console.log('\n3. 测试获取营养模板...');
    try {
      const templates = await adminService.getNutritionTemplates(connection);
      console.log('✅ 获取营养模板成功:');
      console.log(`   - 模板数量: ${templates.length}`);
      if (templates.length > 0) {
        console.log('   - 第一个模板:', templates[0]);
      }
    } catch (error) {
      console.error('❌ 获取营养模板失败:', error.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

// 运行测试
testDishesAPI();
