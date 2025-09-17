#!/usr/bin/env node

/**
 * 菜单创建时间存储验证脚本
 * 用于验证菜单创建时时间字段的存储是否正确
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testMenuCreationTime() {
  let connection;
  
  try {
    console.log('🔍 开始验证菜单创建时间存储...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 检查菜单表结构
    console.log('\n📋 检查菜单表结构:');
    const [tableStructure] = await connection.execute(`
      DESCRIBE menus
    `);
    
    const timeFields = tableStructure.filter(field => 
      field.Field.includes('Time') || field.Field.includes('time')
    );
    
    console.log('时间相关字段:');
    timeFields.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
    });
    
    // 2. 检查现有菜单数据的时间存储
    console.log('\n📊 检查现有菜单数据:');
    const [existingMenus] = await connection.execute(`
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
      ORDER BY createTime DESC 
      LIMIT 5
    `);
    
    if (existingMenus.length === 0) {
      console.log('⚠️  没有找到现有菜单数据，将创建测试数据...');
      
      // 创建测试菜单
      const testMenuId = require('uuid').v4();
      const now = new Date();
      
      console.log(`\n🧪 创建测试菜单 (ID: ${testMenuId})`);
      console.log(`当前时间: ${now.toISOString()}`);
      
      await connection.execute(`
        INSERT INTO menus (
          _id, 
          publishDate, 
          mealType, 
          publishStatus, 
          publisherId, 
          createTime, 
          updateTime
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        testMenuId,
        '2024-01-15',
        'lunch',
        'draft',
        'test-admin-id'
      ]);
      
      console.log('✅ 测试菜单创建成功');
      
      // 查询刚创建的菜单
      const [newMenu] = await connection.execute(`
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
      
      if (newMenu.length > 0) {
        const menu = newMenu[0];
        console.log('\n📋 新创建菜单的时间信息:');
        console.log(`  - 菜单ID: ${menu._id}`);
        console.log(`  - 创建时间: ${menu.createTime}`);
        console.log(`  - 更新时间: ${menu.updateTime}`);
        console.log(`  - 发布时间: ${menu.publishTime || 'NULL'}`);
        console.log(`  - 生效时间: ${menu.effectiveTime || 'NULL'}`);
        
        // 验证时间差
        const createTime = new Date(menu.createTime);
        const timeDiff = Math.abs(now.getTime() - createTime.getTime());
        console.log(`\n⏱️  时间差分析:`);
        console.log(`  - 当前时间: ${now.toISOString()}`);
        console.log(`  - 存储时间: ${createTime.toISOString()}`);
        console.log(`  - 时间差: ${timeDiff}ms`);
        
        if (timeDiff < 5000) { // 5秒内
          console.log('✅ 时间存储正确，时间差在可接受范围内');
        } else {
          console.log('❌ 时间存储可能有问题，时间差过大');
        }
      }
    } else {
      console.log(`找到 ${existingMenus.length} 条菜单记录:`);
      existingMenus.forEach((menu, index) => {
        console.log(`\n${index + 1}. 菜单 ${menu._id}:`);
        console.log(`   - 发布日期: ${menu.publishDate}`);
        console.log(`   - 餐次: ${menu.mealType}`);
        console.log(`   - 状态: ${menu.publishStatus}`);
        console.log(`   - 创建时间: ${menu.createTime}`);
        console.log(`   - 更新时间: ${menu.updateTime}`);
        console.log(`   - 发布时间: ${menu.publishTime || 'NULL'}`);
        console.log(`   - 生效时间: ${menu.effectiveTime || 'NULL'}`);
      });
    }
    
    // 3. 检查数据库时区设置
    console.log('\n🌍 检查数据库时区设置:');
    const [timezoneInfo] = await connection.execute(`
      SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz, NOW() as current_time
    `);
    
    console.log(`  - 全局时区: ${timezoneInfo[0].global_tz}`);
    console.log(`  - 会话时区: ${timezoneInfo[0].session_tz}`);
    console.log(`  - 数据库当前时间: ${timezoneInfo[0].current_time}`);
    
    // 4. 检查应用配置的时区
    console.log('\n⚙️  检查应用时区配置:');
    console.log(`  - 数据库配置时区: ${config.database.timezone}`);
    console.log(`  - Node.js时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`  - 系统当前时间: ${new Date().toISOString()}`);
    
    // 5. 测试NOW()函数的行为
    console.log('\n🧪 测试NOW()函数行为:');
    const [nowTest] = await connection.execute(`SELECT NOW() as db_now, UTC_TIMESTAMP() as db_utc`);
    console.log(`  - NOW(): ${nowTest[0].db_now}`);
    console.log(`  - UTC_TIMESTAMP(): ${nowTest[0].db_utc}`);
    
    console.log('\n✅ 菜单创建时间存储验证完成');
    
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
  testMenuCreationTime().catch(console.error);
}

module.exports = { testMenuCreationTime };
