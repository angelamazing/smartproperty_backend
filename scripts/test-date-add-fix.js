#!/usr/bin/env node

/**
 * 测试使用DATE_ADD函数修复publishDate字段
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testDateAddFix() {
  let connection;
  
  try {
    console.log('🧪 测试使用DATE_ADD函数修复publishDate字段...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 创建测试菜单
    console.log('\n📝 创建测试菜单...');
    
    const testMenuId = require('uuid').v4();
    const userSelectedDate = '2025-09-17'; // 用户选择的日期
    const mealType = 'lunch';
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    // 使用DATE_ADD函数修复时区问题
    const correctedDate = `DATE_ADD('${userSelectedDate}', INTERVAL 8 HOUR)`;
    
    console.log(`  用户选择日期: ${userSelectedDate}`);
    console.log(`  DATE_ADD修复: ${correctedDate}`);
    
    // 插入测试数据
    await connection.execute(
      `INSERT INTO menus (
        _id, 
        publishDate, 
        mealType, 
        description, 
        publishStatus, 
        createTime, 
        updateTime
      ) VALUES (?, ${correctedDate}, ?, ?, ?, ?, ?)`,
      [testMenuId, mealType, '测试DATE_ADD修复', 'draft', now, now]
    );
    
    console.log(`✅ 测试菜单创建成功 (ID: ${testMenuId})`);
    
    // 2. 查询并验证结果
    console.log('\n🔍 查询并验证结果...');
    
    const [testMenus] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        createTime,
        updateTime,
        DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (testMenus.length > 0) {
      const menu = testMenus[0];
      
      console.log('📋 测试菜单数据:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate: ${menu.publishDate}`);
      console.log(`  - 格式化日期: ${menu.formatted_date}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - createTime: ${menu.createTime}`);
      console.log(`  - updateTime: ${menu.updateTime}`);
      
      // 3. 分析修复效果
      console.log('\n🔍 修复效果分析:');
      
      const publishDate = new Date(menu.publishDate);
      const expectedDate = userSelectedDate;
      const actualDate = menu.formatted_date;
      
      console.log(`    原始存储值: ${menu.publishDate}`);
      console.log(`    Date对象: ${publishDate.toISOString()}`);
      console.log(`    转换为北京时间: ${TimeUtils.toBeijingForDisplay(publishDate)}`);
      console.log(`    格式化日期: ${actualDate}`);
      console.log(`    用户期望日期: ${expectedDate}`);
      console.log(`    日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 4. 验证查询功能
      console.log('\n🔍 验证查询功能...');
      
      // 使用DATE_FORMAT函数查询，模拟修复后的查询逻辑
      const [queryResults] = await connection.execute(
        'SELECT _id, publishDate FROM menus WHERE DATE_FORMAT(publishDate, "%Y-%m-%d") = ? AND mealType = ?',
        [userSelectedDate, mealType]
      );
      
      console.log(`    查询结果数量: ${queryResults.length}`);
      if (queryResults.length > 0) {
        console.log(`    找到匹配的菜单: ${queryResults[0]._id}`);
      }
      
      // 5. 最终验证结果
      console.log('\n✅ 最终验证结果:');
      
      const isDateCorrect = expectedDate === actualDate;
      const isQueryCorrect = queryResults.length > 0;
      
      console.log(`    日期修复: ${isDateCorrect ? '✅ 成功' : '❌ 失败'}`);
      console.log(`    查询功能: ${isQueryCorrect ? '✅ 成功' : '❌ 失败'}`);
      
      if (isDateCorrect && isQueryCorrect) {
        console.log('\n🎉 DATE_ADD函数修复完全成功！');
        console.log('   - 用户选择的日期正确存储和显示');
        console.log('   - 查询功能正常工作');
        console.log('   - 时区问题得到解决');
      } else {
        console.log('\n❌ 修复仍有问题，需要进一步检查');
        if (!isDateCorrect) {
          console.log('    日期不匹配，需要调整DATE_ADD参数');
        }
        if (!isQueryCorrect) {
          console.log('    查询功能异常，需要检查查询逻辑');
        }
      }
      
    } else {
      console.log('❌ 没有找到测试菜单数据');
    }
    
    // 6. 清理测试数据
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
  testDateAddFix().catch(console.error);
}

module.exports = { testDateAddFix };
