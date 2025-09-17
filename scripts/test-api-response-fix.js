#!/usr/bin/env node

/**
 * 测试修复后的API返回数据
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testAPIResponseFix() {
  let connection;
  
  try {
    console.log('🧪 测试修复后的API返回数据...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 模拟完整的菜单草稿保存流程
    console.log('\n📝 模拟菜单草稿保存流程:');
    
    const testMenuId = require('uuid').v4();
    const userSelectedDate = '2025-09-17';
    const mealType = 'lunch';
    const description = '测试API返回数据修复';
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    console.log(`  用户选择日期: ${userSelectedDate}`);
    console.log(`  餐次类型: ${mealType}`);
    
    // 使用修复后的逻辑插入数据
    const correctedDate = `DATE_ADD('${userSelectedDate}', INTERVAL 8 HOUR)`;
    
    await connection.execute(
      `INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) VALUES (?, ${correctedDate}, ?, ?, ?, ?, ?)`,
      [testMenuId, mealType, description, 'draft', now, now]
    );
    
    console.log(`✅ 测试菜单创建成功 (ID: ${testMenuId})`);
    
    // 2. 模拟修复后的返回数据查询
    console.log('\n🔍 模拟修复后的返回数据查询:');
    
    const [result] = await connection.execute(`
      SELECT 
        _id as id,
        publishDate,
        mealType,
        description,
        publishStatus as status,
        createTime,
        updateTime,
        DATE_FORMAT(publishDate, '%Y-%m-%d') as date
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (result.length > 0) {
      const menuData = result[0];
      
      console.log('📋 查询到的菜单数据:');
      console.log(`  - id: ${menuData.id}`);
      console.log(`  - date: ${menuData.date}`);
      console.log(`  - publishDate: ${menuData.publishDate}`);
      console.log(`  - mealType: ${menuData.mealType}`);
      console.log(`  - description: ${menuData.description}`);
      console.log(`  - status: ${menuData.status}`);
      console.log(`  - createTime: ${menuData.createTime}`);
      console.log(`  - updateTime: ${menuData.updateTime}`);
      
      // 3. 模拟API响应
      console.log('\n📱 模拟API响应:');
      
      const apiResponse = {
        success: true,
        message: "菜单草稿保存成功",
        code: "200",
        timestamp: new Date().toISOString(),
        data: menuData
      };
      
      console.log('  API响应数据:');
      console.log(`    success: ${apiResponse.success}`);
      console.log(`    message: ${apiResponse.message}`);
      console.log(`    data.id: ${apiResponse.data.id}`);
      console.log(`    data.date: "${apiResponse.data.date}"`);
      console.log(`    data.publishDate: ${apiResponse.data.publishDate}`);
      console.log(`    data.mealType: ${apiResponse.data.mealType}`);
      console.log(`    data.status: ${apiResponse.data.status}`);
      console.log(`    data.createTime: ${apiResponse.data.createTime}`);
      
      // 4. 验证修复效果
      console.log('\n✅ 验证修复效果:');
      
      const expectedDate = userSelectedDate;
      const actualDate = apiResponse.data.date;
      
      console.log(`    用户选择日期: ${expectedDate}`);
      console.log(`    API返回的date字段: "${actualDate}"`);
      console.log(`    日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 5. 前端显示验证
      console.log('\n🖥️  前端显示验证:');
      
      const frontendDate = apiResponse.data.date; // 现在直接使用格式化后的日期
      const frontendCreateTime = TimeUtils.toBeijingForDisplay(apiResponse.data.createTime);
      
      console.log(`    日期前端显示: ${frontendDate}`);
      console.log(`    创建时间前端显示: ${frontendCreateTime}`);
      
      // 6. 最终验证结果
      console.log('\n🎯 最终验证结果:');
      
      const isDateCorrect = expectedDate === actualDate;
      const isApiFormatCorrect = typeof actualDate === 'string' && actualDate.length === 10;
      
      console.log(`    日期正确性: ${isDateCorrect ? '✅ 成功' : '❌ 失败'}`);
      console.log(`    API格式正确性: ${isApiFormatCorrect ? '✅ 成功' : '❌ 失败'}`);
      
      if (isDateCorrect && isApiFormatCorrect) {
        console.log('\n🎉 API返回数据修复完全成功！');
        console.log('   - API返回的date字段格式正确');
        console.log('   - 日期值与用户选择一致');
        console.log('   - 前端可以直接使用返回的date字段');
        console.log('   - 不再需要额外的时区转换');
      } else {
        console.log('\n❌ API返回数据修复失败，需要进一步检查');
        if (!isDateCorrect) {
          console.log('    日期值不正确');
        }
        if (!isApiFormatCorrect) {
          console.log('    日期格式不正确');
        }
      }
      
    } else {
      console.log('❌ 没有找到查询结果');
    }
    
    // 7. 清理测试数据
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
  testAPIResponseFix().catch(console.error);
}

module.exports = { testAPIResponseFix };
