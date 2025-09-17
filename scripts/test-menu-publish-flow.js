#!/usr/bin/env node

/**
 * 菜单发布流程完整测试脚本
 * 模拟真实的菜单发布流程，验证时间处理是否正确
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testMenuPublishFlow() {
  let connection;
  
  try {
    console.log('🧪 开始测试菜单发布流程...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 模拟保存菜单草稿
    console.log('\n📝 步骤1: 保存菜单草稿');
    const menuId = require('uuid').v4();
    const publishDate = '2025-12-01'; // 使用未来日期
    const mealType = 'lunch';
    
    const now = TimeUtils.getBeijingTime();
    const utcNow = TimeUtils.toUTCForStorage(now);
    
    // 验证日期不是过去日期
    if (TimeUtils.isPastDate(publishDate)) {
      console.log('❌ 发布日期验证失败');
      return;
    }
    console.log('✅ 发布日期验证通过');
    
    // 保存草稿
    await connection.execute(`
      INSERT INTO menus (
        _id, publishDate, mealType, publishStatus, 
        description, createTime, updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      menuId,
      publishDate,
      mealType,
      'draft',
      '测试菜单发布流程',
      utcNow,
      utcNow
    ]);
    
    console.log(`✅ 菜单草稿保存成功 (ID: ${menuId})`);
    console.log(`   创建时间: ${TimeUtils.toBeijingForDisplay(utcNow)}`);
    
    // 2. 模拟发布菜单
    console.log('\n🚀 步骤2: 发布菜单');
    
    const publishTime = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    const effectiveTime = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    // 检查是否已有当日菜单
    const [existing] = await connection.execute(
      'SELECT _id, publishStatus FROM menus WHERE publishDate = ? AND mealType = ?',
      [publishDate, mealType]
    );
    
    if (existing.length > 0) {
      const existingStatus = existing[0].publishStatus;
      
      if (existingStatus === 'published') {
        console.log('❌ 当日该餐次菜单已发布');
        return;
      }
      
      // 发布现有菜单
      const existingMenuId = existing[0]._id;
      
      await connection.execute(
        'UPDATE menus SET publishStatus = "published", publishTime = ?, effectiveTime = ?, updateTime = ? WHERE _id = ?',
        [publishTime, effectiveTime, publishTime, existingMenuId]
      );
      
      console.log('✅ 菜单发布成功');
      console.log(`   发布时间: ${TimeUtils.toBeijingForDisplay(publishTime)}`);
      console.log(`   生效时间: ${TimeUtils.toBeijingForDisplay(effectiveTime)}`);
    }
    
    // 3. 验证发布结果
    console.log('\n🔍 步骤3: 验证发布结果');
    
    const [publishedMenu] = await connection.execute(`
      SELECT 
        _id, publishDate, mealType, publishStatus,
        createTime, updateTime, publishTime, effectiveTime
      FROM menus 
      WHERE _id = ?
    `, [menuId]);
    
    if (publishedMenu.length > 0) {
      const menu = publishedMenu[0];
      
      console.log('📋 发布后菜单信息:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - 发布日期: ${menu.publishDate}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - 发布状态: ${menu.publishStatus}`);
      console.log(`  - 创建时间: ${TimeUtils.toBeijingForDisplay(menu.createTime)}`);
      console.log(`  - 更新时间: ${TimeUtils.toBeijingForDisplay(menu.updateTime)}`);
      console.log(`  - 发布时间: ${TimeUtils.toBeijingForDisplay(menu.publishTime)}`);
      console.log(`  - 生效时间: ${TimeUtils.toBeijingForDisplay(menu.effectiveTime)}`);
      
      // 验证时间字段
      const timeChecks = {
        '发布状态': menu.publishStatus === 'published',
        '发布时间': menu.publishTime !== null,
        '生效时间': menu.effectiveTime !== null,
        '时间格式正确': TimeUtils.toBeijingForDisplay(menu.publishTime) !== null
      };
      
      console.log('\n✅ 验证结果:');
      Object.entries(timeChecks).forEach(([check, passed]) => {
        console.log(`  - ${check}: ${passed ? '✅ 通过' : '❌ 失败'}`);
      });
      
      const allPassed = Object.values(timeChecks).every(check => check);
      if (allPassed) {
        console.log('\n🎉 所有验证通过！菜单发布流程工作正常');
      } else {
        console.log('\n❌ 部分验证失败');
      }
    }
    
    // 4. 测试API返回格式
    console.log('\n📡 步骤4: 测试API返回格式');
    
    const [apiMenu] = await connection.execute(`
      SELECT 
        _id, publishDate, mealType, publishStatus,
        createTime, updateTime, publishTime, effectiveTime
      FROM menus 
      WHERE _id = ?
    `, [menuId]);
    
    if (apiMenu.length > 0) {
      const menu = apiMenu[0];
      
      console.log('📋 API返回格式 (ISO 8601):');
      console.log(`  - createTime: ${TimeUtils.toISOString(menu.createTime)}`);
      console.log(`  - updateTime: ${TimeUtils.toISOString(menu.updateTime)}`);
      console.log(`  - publishTime: ${TimeUtils.toISOString(menu.publishTime)}`);
      console.log(`  - effectiveTime: ${TimeUtils.toISOString(menu.effectiveTime)}`);
      
      console.log('\n📋 前端显示格式 (北京时间):');
      console.log(`  - createTime: ${TimeUtils.toBeijingForDisplay(menu.createTime)}`);
      console.log(`  - updateTime: ${TimeUtils.toBeijingForDisplay(menu.updateTime)}`);
      console.log(`  - publishTime: ${TimeUtils.toBeijingForDisplay(menu.publishTime)}`);
      console.log(`  - effectiveTime: ${TimeUtils.toBeijingForDisplay(menu.effectiveTime)}`);
    }
    
    // 5. 清理测试数据
    console.log('\n🧹 步骤5: 清理测试数据');
    await connection.execute('DELETE FROM menus WHERE _id = ?', [menuId]);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n✅ 菜单发布流程测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
if (require.main === module) {
  testMenuPublishFlow().catch(console.error);
}

module.exports = { testMenuPublishFlow };
