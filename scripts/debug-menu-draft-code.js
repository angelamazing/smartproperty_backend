#!/usr/bin/env node

/**
 * 调试菜单草稿代码逻辑
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');
const { v4: uuidv4 } = require('uuid');

async function debugMenuDraftCode() {
  let connection;
  
  try {
    console.log('🐛 调试菜单草稿代码逻辑...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 模拟请求数据
    console.log('\n📝 模拟请求数据:');
    const menuData = {
      date: '2025-09-17',
      mealType: 'breakfast',
      dishes: [
        {
          dishId: 'test-dish-1',
          price: 10.00,
          sort: 1
        }
      ],
      description: '测试菜单',
      adminId: 'test-admin-id'
    };
    
    console.log('  原始请求数据:');
    console.log(`    date: ${menuData.date}`);
    console.log(`    mealType: ${menuData.mealType}`);
    console.log(`    description: ${menuData.description}`);
    
    // 2. 模拟代码逻辑
    console.log('\n⚙️  模拟代码逻辑:');
    
    const { date, mealType, dishes, description, adminId } = menuData;
    
    // 修复publishDate字段的时区问题
    const correctedDate = `DATE_ADD('${date}', INTERVAL 8 HOUR)`;
    console.log(`  原始日期: ${date}`);
    console.log(`  修正后日期: ${correctedDate}`);
    
    // 检查是否已存在相同日期和餐次的菜单
    console.log('\n🔍 检查现有菜单:');
    const [existing] = await connection.execute(
      'SELECT _id, publishStatus FROM menus WHERE DATE_FORMAT(publishDate, "%Y-%m-%d") = ? AND mealType = ?',
      [date, mealType]
    );
    
    console.log(`  查询结果: ${existing.length} 条记录`);
    
    let menuId;
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    if (existing.length > 0) {
      console.log('  📝 更新现有菜单草稿');
      menuId = existing[0]._id;
      // 更新逻辑...
    } else {
      console.log('  📝 创建新菜单草稿');
      menuId = uuidv4();
      
      console.log(`  生成的菜单ID: ${menuId}`);
      console.log(`  当前时间: ${now}`);
      
      // 使用修正后的日期存储，解决时区转换问题
      console.log('\n💾 插入菜单数据:');
      console.log(`  SQL: INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, publisherId, createTime, updateTime) VALUES (?, ${correctedDate}, ?, ?, ?, ?, ?, ?)`);
      console.log(`  参数: [${menuId}, ${mealType}, ${description}, 'draft', ${adminId}, ${now}, ${now}]`);
      
      await connection.execute(
        `INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, publisherId, createTime, updateTime) VALUES (?, ${correctedDate}, ?, ?, ?, ?, ?, ?)`,
        [menuId, mealType, description, 'draft', adminId, now, now]
      );
      
      console.log('  ✅ 菜单插入成功');
    }
    
    // 保存菜单菜品关联
    if (dishes && dishes.length > 0) {
      console.log('\n🍽️  保存菜品关联:');
      for (const dish of dishes) {
        const dishId = uuidv4();
        console.log(`  插入菜品: ${dish.dishId}, 价格: ${dish.price}, 排序: ${dish.sort}`);
        
        await connection.execute(
          'INSERT INTO menu_dishes (_id, menuId, dishId, price, sort, createTime) VALUES (?, ?, ?, ?, ?, ?)',
          [dishId, menuId, dish.dishId, dish.price || 0, dish.sort || 0, now]
        );
      }
      console.log('  ✅ 菜品关联保存成功');
    }
    
    // 查询并返回实际存储的数据
    console.log('\n🔍 查询返回数据:');
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
    `, [menuId]);
    
    if (result.length > 0) {
      const menuResult = result[0];
      
      console.log('📋 查询结果:');
      console.log(`  - id: ${menuResult.id}`);
      console.log(`  - date: ${menuResult.date}`);
      console.log(`  - publishDate: ${menuResult.publishDate}`);
      console.log(`  - mealType: ${menuResult.mealType}`);
      console.log(`  - description: ${menuResult.description}`);
      console.log(`  - status: ${menuResult.status}`);
      console.log(`  - createTime: ${menuResult.createTime}`);
      console.log(`  - updateTime: ${menuResult.updateTime}`);
      
      // 验证结果
      console.log('\n✅ 验证结果:');
      const expectedDate = menuData.date;
      const actualDate = menuResult.date;
      
      console.log(`  期望日期: ${expectedDate}`);
      console.log(`  实际日期: ${actualDate}`);
      console.log(`  日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      if (expectedDate === actualDate) {
        console.log('\n🎉 代码逻辑正确！');
      } else {
        console.log('\n❌ 代码逻辑有问题！');
      }
      
    } else {
      console.log('❌ 查询结果为空');
    }
    
    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.execute('DELETE FROM menu_dishes WHERE menuId = ?', [menuId]);
    await connection.execute('DELETE FROM menus WHERE _id = ?', [menuId]);
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行调试
if (require.main === module) {
  debugMenuDraftCode().catch(console.error);
}

module.exports = { debugMenuDraftCode };
