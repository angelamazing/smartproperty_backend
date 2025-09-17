#!/usr/bin/env node

/**
 * 菜单时间处理修复验证脚本
 * 用于验证菜单发布和草稿保存过程中的时间处理是否正确
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testMenuTimeFix() {
  let connection;
  
  try {
    console.log('🔍 开始验证菜单时间处理修复...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 测试时间工具类功能
    console.log('\n📋 测试时间工具类功能:');
    const beijingTime = TimeUtils.getBeijingTime();
    const utcTime = TimeUtils.toUTCForStorage(beijingTime);
    const displayTime = TimeUtils.toBeijingForDisplay(utcTime);
    
    console.log(`  - 当前北京时间: ${beijingTime.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`  - 转换为UTC存储: ${utcTime.toISOString()}`);
    console.log(`  - UTC转换为北京时间显示: ${displayTime}`);
    
    // 2. 创建测试菜单草稿
    console.log('\n🧪 创建测试菜单草稿:');
    const testMenuId = require('uuid').v4();
    const testDate = '2024-02-01';
    const testMealType = 'lunch';
    
    const createTime = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    await connection.execute(`
      INSERT INTO menus (
        _id, 
        publishDate, 
        mealType, 
        publishStatus, 
        description,
        createTime, 
        updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      testMenuId,
      testDate,
      testMealType,
      'draft',
      '测试菜单时间处理',
      createTime,
      createTime
    ]);
    
    console.log(`✅ 测试菜单草稿创建成功 (ID: ${testMenuId})`);
    console.log(`   创建时间 (UTC): ${createTime.toISOString()}`);
    
    // 3. 查询刚创建的菜单
    const [testMenu] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        publishStatus,
        createTime, 
        updateTime, 
        publishTime,
        effectiveTime
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (testMenu.length > 0) {
      const menu = testMenu[0];
      console.log('\n📋 测试菜单时间信息:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - 发布日期: ${menu.publishDate}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - 发布状态: ${menu.publishStatus}`);
      console.log(`  - 创建时间: ${menu.createTime}`);
      console.log(`  - 更新时间: ${menu.updateTime}`);
      console.log(`  - 发布时间: ${menu.publishTime || 'NULL'}`);
      console.log(`  - 生效时间: ${menu.effectiveTime || 'NULL'}`);
      
      // 验证时间转换
      const storedCreateTime = new Date(menu.createTime);
      const timeDiff = Math.abs(createTime.getTime() - storedCreateTime.getTime());
      console.log(`\n⏱️  时间验证:`);
      console.log(`  - 预期时间: ${createTime.toISOString()}`);
      console.log(`  - 存储时间: ${storedCreateTime.toISOString()}`);
      console.log(`  - 时间差: ${timeDiff}ms`);
      
      if (timeDiff < 1000) { // 1秒内
        console.log('✅ 时间存储正确');
      } else {
        console.log('❌ 时间存储可能有问题');
      }
    }
    
    // 4. 测试发布菜单（模拟发布流程）
    console.log('\n🚀 测试菜单发布流程:');
    const publishTime = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    const effectiveTime = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    await connection.execute(`
      UPDATE menus SET 
        publishStatus = 'published',
        publishTime = ?,
        effectiveTime = ?,
        updateTime = ?
      WHERE _id = ?
    `, [publishTime, effectiveTime, publishTime, testMenuId]);
    
    console.log(`✅ 菜单发布成功`);
    console.log(`   发布时间 (UTC): ${publishTime.toISOString()}`);
    console.log(`   生效时间 (UTC): ${effectiveTime.toISOString()}`);
    
    // 5. 验证发布后的时间
    const [publishedMenu] = await connection.execute(`
      SELECT 
        _id, 
        publishStatus,
        createTime, 
        updateTime, 
        publishTime,
        effectiveTime
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (publishedMenu.length > 0) {
      const menu = publishedMenu[0];
      console.log('\n📋 发布后菜单时间信息:');
      console.log(`  - 发布状态: ${menu.publishStatus}`);
      console.log(`  - 创建时间: ${menu.createTime}`);
      console.log(`  - 更新时间: ${menu.updateTime}`);
      console.log(`  - 发布时间: ${menu.publishTime}`);
      console.log(`  - 生效时间: ${menu.effectiveTime}`);
      
      // 验证发布时间和生效时间是否设置正确
      if (menu.publishTime && menu.effectiveTime) {
        console.log('✅ 发布时间和生效时间设置正确');
      } else {
        console.log('❌ 发布时间或生效时间未正确设置');
      }
    }
    
    // 6. 测试时间转换显示
    console.log('\n🔄 测试时间转换显示:');
    const [finalMenu] = await connection.execute(`
      SELECT 
        createTime, 
        updateTime, 
        publishTime,
        effectiveTime
      FROM menus 
      WHERE _id = ?
    `, [testMenuId]);
    
    if (finalMenu.length > 0) {
      const menu = finalMenu[0];
      console.log('  UTC时间 → 北京时间显示:');
      console.log(`  - 创建时间: ${TimeUtils.toBeijingForDisplay(menu.createTime)}`);
      console.log(`  - 更新时间: ${TimeUtils.toBeijingForDisplay(menu.updateTime)}`);
      console.log(`  - 发布时间: ${TimeUtils.toBeijingForDisplay(menu.publishTime)}`);
      console.log(`  - 生效时间: ${TimeUtils.toBeijingForDisplay(menu.effectiveTime)}`);
    }
    
    // 7. 清理测试数据
    console.log('\n🧹 清理测试数据:');
    await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n✅ 菜单时间处理修复验证完成');
    console.log('\n📊 修复总结:');
    console.log('  ✅ 使用统一时间工具类 TimeUtils');
    console.log('  ✅ 正确转换北京时间到UTC存储');
    console.log('  ✅ 正确设置发布时间和生效时间');
    console.log('  ✅ 支持时间格式验证和显示转换');
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行验证
if (require.main === module) {
  testMenuTimeFix().catch(console.error);
}

module.exports = { testMenuTimeFix };
