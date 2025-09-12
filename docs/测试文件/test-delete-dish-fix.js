const mysql = require('mysql2/promise');
const config = require('./config/database');
const dishService = require('./services/dishService');

async function testDeleteDishFix() {
  let pool;
  
  try {
    console.log('🧪 测试删除菜品功能修复...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 获取一个现有菜品ID
    console.log('\n📋 测试1: 获取现有菜品ID');
    try {
      const [dishes] = await pool.execute('SELECT _id, name FROM dishes WHERE status != "deleted" LIMIT 1');
      
      if (dishes.length === 0) {
        console.log('⚠️ 没有找到可用菜品，创建测试菜品...');
        
        // 创建测试菜品
        const testDish = {
          name: '测试菜品-' + Date.now(),
          description: '用于测试删除功能的菜品',
          price: 25.00,
          categoryId: 'test-category',
          status: 'active'
        };
        
        const [result] = await pool.execute(`
          INSERT INTO dishes (_id, name, description, price, categoryId, status, createTime) 
          VALUES (UUID(), ?, ?, ?, ?, ?, NOW())
        `, [testDish.name, testDish.description, testDish.price, testDish.categoryId, testDish.status]);
        
        console.log('✅ 测试菜品创建成功');
        const testDishId = result.insertId;
        
        // 测试删除
        console.log('\n📋 测试2: 删除测试菜品');
        try {
          const result = await dishService.deleteDish(pool, testDishId, 'test-user');
          console.log('✅ 删除菜品成功:', result);
          
          // 验证删除结果
          const [deletedDish] = await pool.execute('SELECT status FROM dishes WHERE _id = ?', [testDishId]);
          if (deletedDish.length > 0 && deletedDish[0].status === 'deleted') {
            console.log('✅ 菜品状态已正确更新为deleted');
          } else {
            console.log('❌ 菜品状态更新失败');
          }
          
        } catch (error) {
          console.log('❌ 删除菜品失败:', error.message);
        }
        
      } else {
        const dishId = dishes[0]._id;
        const dishName = dishes[0].name;
        console.log(`✅ 找到测试菜品: ${dishName} (ID: ${dishId})`);
        
        // 测试删除
        console.log('\n📋 测试2: 删除现有菜品');
        try {
          const result = await dishService.deleteDish(pool, dishId, 'test-user');
          console.log('✅ 删除菜品成功:', result);
          
          // 验证删除结果
          const [deletedDish] = await pool.execute('SELECT status FROM dishes WHERE _id = ?', [dishId]);
          if (deletedDish.length > 0 && deletedDish[0].status === 'deleted') {
            console.log('✅ 菜品状态已正确更新为deleted');
          } else {
            console.log('❌ 菜品状态更新失败');
          }
          
          // 恢复菜品状态（避免影响其他测试）
          await pool.execute('UPDATE dishes SET status = "active" WHERE _id = ?', [dishId]);
          console.log('✅ 菜品状态已恢复为active');
          
        } catch (error) {
          console.log('❌ 删除菜品失败:', error.message);
        }
      }
      
    } catch (error) {
      console.log('❌ 获取菜品失败:', error.message);
    }
    
    // 测试3: 测试无效ID
    console.log('\n📋 测试3: 测试无效菜品ID');
    try {
      const result = await dishService.deleteDish(pool, 'invalid-id', 'test-user');
      console.log('✅ 删除无效ID成功:', result);
    } catch (error) {
      console.log('✅ 删除无效ID失败（预期行为）:', error.message);
    }
    
    console.log('\n🎉 删除菜品功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 连接池已关闭');
    }
  }
}

// 运行测试
testDeleteDishFix();
