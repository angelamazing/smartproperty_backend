#!/usr/bin/env node

/**
 * 测试真实的API调用
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testRealAPICall() {
  let connection;
  
  try {
    console.log('🧪 测试真实的API调用...\n');
    
    // 1. 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 2. 获取一个有效的用户token（模拟登录）
    console.log('\n🔑 获取有效的用户token...');
    
    const [users] = await connection.execute(`
      SELECT _id, email, role 
      FROM users 
      WHERE role = 'admin' 
      LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('❌ 没有找到管理员用户，需要先创建用户');
      return;
    }
    
    const adminUser = users[0];
    console.log(`找到管理员用户: ${adminUser.email}`);
    
    // 3. 模拟真实的API请求
    console.log('\n📡 发送API请求...');
    
    const requestData = {
      date: '2025-09-17',
      mealType: 'breakfast',
      description: '测试真实API调用',
      dishes: [
        {
          dishId: 'test-dish-1',
          price: 10.00,
          sort: 1
        }
      ]
    };
    
    console.log('请求数据:');
    console.log(`  date: ${requestData.date}`);
    console.log(`  mealType: ${requestData.mealType}`);
    console.log(`  description: ${requestData.description}`);
    
    try {
      // 使用axios发送请求
      const response = await axios.post('http://localhost:3000/api/admin/menu/draft', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer valid-token-${adminUser._id}`, // 使用真实的用户ID
        },
        timeout: 5000
      });
      
      console.log('\n📱 API响应:');
      console.log(`状态码: ${response.status}`);
      console.log(`响应数据:`, JSON.stringify(response.data, null, 2));
      
      // 4. 分析响应数据
      if (response.data && response.data.success) {
        const responseData = response.data.data;
        
        console.log('\n🔍 响应数据分析:');
        console.log(`  success: ${response.data.success}`);
        console.log(`  message: ${response.data.message}`);
        console.log(`  data.id: ${responseData.id}`);
        console.log(`  data.date: "${responseData.date}"`);
        console.log(`  data.publishDate: ${responseData.publishDate}`);
        console.log(`  data.mealType: ${responseData.mealType}`);
        console.log(`  data.status: ${responseData.status}`);
        
        // 验证日期
        const expectedDate = requestData.date;
        const actualDate = responseData.date;
        
        console.log('\n✅ 日期验证:');
        console.log(`  请求的日期: ${expectedDate}`);
        console.log(`  返回的日期: "${actualDate}"`);
        console.log(`  日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
        
        // 检查数据库中的实际存储
        console.log('\n🔍 检查数据库存储:');
        
        const [dbData] = await connection.execute(`
          SELECT 
            _id,
            publishDate,
            DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date,
            mealType,
            publishStatus,
            createTime
          FROM menus 
          WHERE _id = ?
        `, [responseData.id]);
        
        if (dbData.length > 0) {
          const menu = dbData[0];
          console.log(`  数据库ID: ${menu._id}`);
          console.log(`  数据库publishDate: ${menu.publishDate}`);
          console.log(`  格式化日期: ${menu.formatted_date}`);
          console.log(`  餐次类型: ${menu.mealType}`);
          console.log(`  状态: ${menu.publishStatus}`);
          console.log(`  创建时间: ${menu.createTime}`);
          
          // 最终验证
          console.log('\n🎯 最终验证结果:');
          
          const apiDateCorrect = expectedDate === actualDate;
          const dbDateCorrect = expectedDate === menu.formatted_date;
          
          console.log(`  API日期正确: ${apiDateCorrect ? '✅' : '❌'}`);
          console.log(`  数据库日期正确: ${dbDateCorrect ? '✅' : '❌'}`);
          
          if (apiDateCorrect && dbDateCorrect) {
            console.log('\n🎉 修复完全成功！');
            console.log('   - API返回的日期正确');
            console.log('   - 数据库存储的日期正确');
            console.log('   - 用户体验正常');
          } else {
            console.log('\n❌ 修复失败，存在问题:');
            if (!apiDateCorrect) {
              console.log('   - API返回的日期不正确');
            }
            if (!dbDateCorrect) {
              console.log('   - 数据库存储的日期不正确');
            }
          }
          
          // 清理测试数据
          console.log('\n🧹 清理测试数据...');
          await connection.execute('DELETE FROM menus WHERE _id = ?', [responseData.id]);
          console.log('✅ 测试数据清理完成');
          
        } else {
          console.log('❌ 数据库中没有找到对应的菜单记录');
        }
        
      } else {
        console.log('❌ API请求失败');
        console.log('响应数据:', response.data);
      }
      
    } catch (apiError) {
      console.error('❌ API请求出错:', apiError.message);
      if (apiError.response) {
        console.error('响应状态:', apiError.response.status);
        console.error('响应数据:', apiError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
if (require.main === module) {
  testRealAPICall().catch(console.error);
}

module.exports = { testRealAPICall };
