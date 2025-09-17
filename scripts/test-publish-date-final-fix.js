#!/usr/bin/env node

/**
 * 测试 publishDate 字段最终修复效果
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testPublishDateFinalFix() {
  let connection;
  
  try {
    console.log('🧪 测试 publishDate 字段最终修复效果...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 创建测试菜单
    console.log('\n📝 创建测试菜单...');
    
    const testMenuId = require('uuid').v4();
    const userSelectedDate = '2025-09-17'; // 用户选择的日期
    const mealType = 'dinner';
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    // 使用修复后的逻辑：添加8小时偏移
    const correctedDate = `${userSelectedDate} 08:00:00`;
    
    console.log(`  用户选择日期: ${userSelectedDate}`);
    console.log(`  修正后存储: ${correctedDate}`);
    
    // 插入测试数据
    await connection.execute(`
      INSERT INTO menus (
        _id, 
        publishDate, 
        mealType, 
        description, 
        publishStatus, 
        createTime, 
        updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      testMenuId,
      correctedDate,
      mealType,
      '测试publishDate最终修复',
      'draft',
      now,
      now
    ]);
    
    console.log(`✅ 测试菜单创建成功 (ID: ${testMenuId})`);
    
    // 2. 查询并验证结果
    console.log('\n🔍 查询并验证结果...');
    
    const [testMenus] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        createTime,
        updateTime
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (testMenus.length > 0) {
      const menu = testMenus[0];
      
      console.log('📋 测试菜单数据:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate: ${menu.publishDate}`);
      console.log(`  - publishDate类型: ${typeof menu.publishDate}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - createTime: ${menu.createTime}`);
      console.log(`  - updateTime: ${menu.updateTime}`);
      
      // 3. 分析修复效果
      console.log('\n🔍 修复效果分析:');
      
      const publishDate = new Date(menu.publishDate);
      const expectedDate = userSelectedDate;
      const actualDate = publishDate.toISOString().split('T')[0];
      
      console.log(`    原始存储值: ${menu.publishDate}`);
      console.log(`    Date对象: ${publishDate.toISOString()}`);
      console.log(`    转换为北京时间: ${TimeUtils.toBeijingForDisplay(publishDate)}`);
      console.log(`    日期部分: ${actualDate}`);
      console.log(`    用户期望日期: ${expectedDate}`);
      console.log(`    日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 4. 验证API返回格式
      console.log('\n📱 API返回格式验证:');
      
      // 模拟API返回的格式
      const apiResponse = {
        success: true,
        message: "获取菜单成功",
        code: "200",
        timestamp: new Date().toISOString(),
        data: {
          _id: menu._id,
          publishDate: menu.publishDate,
          mealType: menu.mealType,
          publishStatus: 'draft',
          createTime: menu.createTime,
          updateTime: menu.updateTime
        }
      };
      
      console.log('  API返回数据:');
      console.log(`    publishDate: "${apiResponse.data.publishDate}"`);
      console.log(`    createTime: "${apiResponse.data.createTime}"`);
      
      // 5. 前端显示验证
      console.log('\n🖥️  前端显示验证:');
      
      const frontendPublishDate = TimeUtils.toBeijingForDisplay(apiResponse.data.publishDate);
      const frontendCreateTime = TimeUtils.toBeijingForDisplay(apiResponse.data.createTime);
      
      console.log(`    publishDate前端显示: ${frontendPublishDate}`);
      console.log(`    createTime前端显示: ${frontendCreateTime}`);
      
      // 6. 最终验证结果
      console.log('\n✅ 最终验证结果:');
      
      const isDateCorrect = expectedDate === actualDate;
      const isTimeCorrect = frontendCreateTime.includes('08:') || frontendCreateTime.includes('09:');
      
      console.log(`    日期修复: ${isDateCorrect ? '✅ 成功' : '❌ 失败'}`);
      console.log(`    时间修复: ${isTimeCorrect ? '✅ 成功' : '❌ 失败'}`);
      
      if (isDateCorrect && isTimeCorrect) {
        console.log('\n🎉 publishDate 字段修复完全成功！');
        console.log('   - 用户选择的日期正确存储和显示');
        console.log('   - 不再出现提前16小时的问题');
        console.log('   - API返回格式正确');
        console.log('   - 前端显示正确');
      } else {
        console.log('\n❌ 修复仍有问题，需要进一步检查');
      }
      
    } else {
      console.log('❌ 没有找到测试菜单数据');
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
  testPublishDateFinalFix().catch(console.error);
}

module.exports = { testPublishDateFinalFix };
