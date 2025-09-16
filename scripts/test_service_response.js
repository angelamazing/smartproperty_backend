const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

async function testServiceResponse() {
  let connection;
  
  try {
    console.log('🔍 测试服务层响应...\n');
    
    // 创建数据库连接池
    const dbPool = mysql.createPool(config.database);
    console.log('✅ 数据库连接池创建成功');
    
    // 模拟req.db
    const mockReq = { db: dbPool };
    
    // 测试getDishes服务函数
    console.log('📋 测试getDishes服务函数...');
    const result = await adminService.getDishes(mockReq.db, {
      page: 1,
      pageSize: 3,
      filters: {}
    });
    
    console.log('📊 服务层返回结果:');
    console.log('总数:', result.total);
    console.log('菜品数量:', result.list.length);
    
    if (result.list.length > 0) {
      const firstDish = result.list[0];
      console.log('\n第一个菜品的字段:');
      Object.keys(firstDish).forEach(key => {
        console.log(`  - ${key}: ${typeof firstDish[key]} = ${JSON.stringify(firstDish[key])}`);
      });
      
      // 特别检查meal_types字段
      if (firstDish.meal_types !== undefined) {
        console.log('\n✅ meal_types字段存在:', JSON.stringify(firstDish.meal_types));
      } else {
        console.log('\n❌ meal_types字段不存在');
      }
    }
    
    // 测试JSON序列化
    console.log('\n📋 测试JSON序列化...');
    const jsonString = JSON.stringify(result, null, 2);
    console.log('JSON序列化结果长度:', jsonString.length);
    
    // 检查JSON中是否包含meal_types
    if (jsonString.includes('meal_types')) {
      console.log('✅ JSON序列化包含meal_types字段');
    } else {
      console.log('❌ JSON序列化不包含meal_types字段');
    }
    
    console.log('\n📋 完整响应数据:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testServiceResponse();
