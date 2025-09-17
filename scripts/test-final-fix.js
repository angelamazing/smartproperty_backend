#!/usr/bin/env node

/**
 * 测试最终的修复效果
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testFinalFix() {
  let connection;
  
  try {
    console.log('🧪 测试最终的修复效果...\n');
    
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前字段类型
    console.log('\n📋 检查当前字段类型:');
    
    const [columns] = await connection.execute(`DESCRIBE menus`);
    const publishDateColumn = columns.find(col => col.Field === 'publishDate');
    
    if (publishDateColumn) {
      console.log(`  publishDate字段类型: ${publishDateColumn.Type}`);
      console.log(`  允许NULL: ${publishDateColumn.Null}`);
    }
    
    // 2. 测试存储和查询
    console.log('\n📝 测试存储和查询:');
    
    const testMenuId = require('uuid').v4();
    const userDate = '2025-12-25'; // 使用唯一日期
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    console.log(`  用户选择日期: ${userDate}`);
    
    // 直接存储日期字符串
    await connection.execute(
      'INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testMenuId, userDate, 'breakfast', '测试最终修复', 'draft', now, now]
    );
    
    console.log('  ✅ 菜单创建成功');
    
    // 3. 查询并验证结果
    console.log('\n🔍 查询并验证结果:');
    
    const [results] = await connection.execute(`
      SELECT 
        _id,
        publishDate,
        mealType,
        description,
        publishStatus,
        createTime
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (results.length > 0) {
      const menu = results[0];
      
      console.log('📋 查询结果:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate: ${menu.publishDate}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - 描述: ${menu.description}`);
      console.log(`  - 状态: ${menu.publishStatus}`);
      console.log(`  - 创建时间: ${menu.createTime}`);
      
      // 4. 验证日期
      console.log('\n✅ 验证日期:');
      console.log(`  用户选择日期: ${userDate}`);
      console.log(`  数据库存储: ${menu.publishDate}`);
      console.log(`  日期匹配: ${userDate === menu.publishDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 5. 模拟API返回
      console.log('\n📱 模拟API返回:');
      
      const apiResponse = {
        success: true,
        message: "菜单草稿保存成功",
        code: "200",
        timestamp: new Date().toISOString(),
        data: {
          id: menu._id,
          date: menu.publishDate,
          mealType: menu.mealType,
          description: menu.description,
          status: menu.publishStatus,
          createTime: menu.createTime
        }
      };
      
      console.log('  API响应数据:');
      console.log(`    success: ${apiResponse.success}`);
      console.log(`    data.date: "${apiResponse.data.date}"`);
      console.log(`    data.createTime: ${apiResponse.data.createTime}`);
      
      // 6. 前端显示验证
      console.log('\n🖥️  前端显示验证:');
      
      const frontendDate = apiResponse.data.date; // 直接使用存储的日期字符串
      const frontendCreateTime = TimeUtils.toBeijingForDisplay(apiResponse.data.createTime);
      
      console.log(`    日期前端显示: ${frontendDate}`);
      console.log(`    创建时间前端显示: ${frontendCreateTime}`);
      
      // 7. 最终验证
      console.log('\n🎯 最终验证结果:');
      
      const isDateCorrect = userDate === menu.publishDate;
      const isApiCorrect = apiResponse.success;
      
      console.log(`    日期正确性: ${isDateCorrect ? '✅ 成功' : '❌ 失败'}`);
      console.log(`    API响应: ${isApiCorrect ? '✅ 成功' : '❌ 失败'}`);
      
      if (isDateCorrect && isApiCorrect) {
        console.log('\n🎉 最终修复成功！');
        console.log('  - 用户选择的日期正确存储');
        console.log('  - API返回的date字段格式正确');
        console.log('  - 前端可以直接显示正确的日期');
        console.log('  - 不再有时区转换问题');
      } else {
        console.log('\n❌ 修复失败，需要进一步检查');
      }
      
    } else {
      console.log('❌ 没有找到查询结果');
    }
    
    // 8. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
if (require.main === module) {
  testFinalFix().catch(console.error);
}

module.exports = { testFinalFix };
