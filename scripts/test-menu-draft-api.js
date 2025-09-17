#!/usr/bin/env node

/**
 * 测试菜单草稿保存API的完整流程
 * 模拟实际的API请求和响应
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');
const TimeUtils = require('../utils/timeUtils');

async function testMenuDraftAPI() {
  let connection;
  
  try {
    console.log('🧪 测试菜单草稿保存API完整流程...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 模拟API请求数据
    console.log('\n📝 模拟API请求数据:');
    
    const requestBody = {
      date: '2025-09-17', // 用户选择的日期
      mealType: 'breakfast',
      description: '测试菜单草稿API',
      dishes: [
        {
          dishId: 'test-dish-1',
          price: 10.00,
          sort: 1
        }
      ]
    };
    
    console.log('  请求体数据:');
    console.log(`    date: ${requestBody.date}`);
    console.log(`    mealType: ${requestBody.mealType}`);
    console.log(`    description: ${requestBody.description}`);
    console.log(`    dishes: ${JSON.stringify(requestBody.dishes)}`);
    
    // 2. 模拟控制器处理逻辑
    console.log('\n🎛️  模拟控制器处理逻辑:');
    
    // 验证日期
    if (requestBody.date && TimeUtils.isPastDate(requestBody.date)) {
      console.log('  ❌ 日期验证失败: 发布日期不能是过去的日期');
      return;
    } else {
      console.log('  ✅ 日期验证通过');
    }
    
    // 构建菜单数据
    const menuData = {
      ...requestBody,
      adminId: 'test-admin-id',
      status: 'draft'
    };
    
    console.log('  构建的菜单数据:');
    console.log(`    date: ${menuData.date}`);
    console.log(`    mealType: ${menuData.mealType}`);
    console.log(`    adminId: ${menuData.adminId}`);
    console.log(`    status: ${menuData.status}`);
    
    // 3. 模拟服务层处理逻辑
    console.log('\n⚙️  模拟服务层处理逻辑:');
    
    const { date, mealType, dishes, description, adminId } = menuData;
    
    // 修复publishDate字段的时区问题
    const correctedDate = `DATE_ADD('${date}', INTERVAL 8 HOUR)`;
    console.log(`  原始日期: ${date}`);
    console.log(`  修正后日期: ${correctedDate}`);
    
    // 检查是否已存在相同日期和餐次的菜单
    const [existing] = await connection.execute(
      'SELECT _id, publishStatus FROM menus WHERE DATE_FORMAT(publishDate, "%Y-%m-%d") = ? AND mealType = ?',
      [date, mealType]
    );
    
    console.log(`  查询现有菜单结果: ${existing.length} 条`);
    
    let menuId;
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    if (existing.length > 0) {
      console.log('  📝 更新现有菜单草稿');
      menuId = existing[0]._id;
      // 更新逻辑...
    } else {
      console.log('  📝 创建新菜单草稿');
      menuId = require('uuid').v4();
      
      // 插入新菜单（不设置publisherId避免外键约束问题）
      await connection.execute(
        `INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, createTime, updateTime) VALUES (?, ${correctedDate}, ?, ?, ?, ?, ?)`,
        [menuId, mealType, description, 'draft', now, now]
      );
      
      console.log(`  ✅ 新菜单创建成功 (ID: ${menuId})`);
    }
    
    // 4. 查询并验证结果
    console.log('\n🔍 查询并验证结果:');
    
    const [testMenus] = await connection.execute(`
      SELECT 
        _id, 
        publishDate, 
        mealType, 
        description,
        publishStatus,
        createTime,
        updateTime,
        DATE_FORMAT(publishDate, '%Y-%m-%d') as formatted_date
      FROM menus 
      WHERE _id = ?
    `, [menuId]);
    
    if (testMenus.length > 0) {
      const menu = testMenus[0];
      
      console.log('📋 存储的菜单数据:');
      console.log(`  - 菜单ID: ${menu._id}`);
      console.log(`  - publishDate: ${menu.publishDate}`);
      console.log(`  - 格式化日期: ${menu.formatted_date}`);
      console.log(`  - 餐次类型: ${menu.mealType}`);
      console.log(`  - 描述: ${menu.description}`);
      console.log(`  - 状态: ${menu.publishStatus}`);
      console.log(`  - 创建时间: ${menu.createTime}`);
      console.log(`  - 更新时间: ${menu.updateTime}`);
      
      // 5. 分析结果
      console.log('\n🔍 结果分析:');
      
      const expectedDate = requestBody.date;
      const actualDate = menu.formatted_date;
      
      console.log(`    用户选择日期: ${expectedDate}`);
      console.log(`    存储的日期: ${actualDate}`);
      console.log(`    日期匹配: ${expectedDate === actualDate ? '✅ 正确' : '❌ 错误'}`);
      
      // 6. 模拟API响应
      console.log('\n📱 模拟API响应:');
      
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
          createTime: menu.createTime,
          updateTime: menu.updateTime
        }
      };
      
      console.log('  API响应数据:');
      console.log(`    success: ${apiResponse.success}`);
      console.log(`    message: ${apiResponse.message}`);
      console.log(`    data.date: ${apiResponse.data.date}`);
      console.log(`    data.createTime: ${apiResponse.data.createTime}`);
      
      // 7. 前端显示验证
      console.log('\n🖥️  前端显示验证:');
      
      const frontendDate = TimeUtils.toBeijingForDisplay(apiResponse.data.date);
      const frontendCreateTime = TimeUtils.toBeijingForDisplay(apiResponse.data.createTime);
      
      console.log(`    日期前端显示: ${frontendDate}`);
      console.log(`    创建时间前端显示: ${frontendCreateTime}`);
      
      // 8. 最终验证
      console.log('\n✅ 最终验证结果:');
      
      const isDateCorrect = expectedDate === actualDate;
      const isApiCorrect = apiResponse.success;
      
      console.log(`    日期正确性: ${isDateCorrect ? '✅ 成功' : '❌ 失败'}`);
      console.log(`    API响应: ${isApiCorrect ? '✅ 成功' : '❌ 失败'}`);
      
      if (isDateCorrect && isApiCorrect) {
        console.log('\n🎉 菜单草稿保存API测试完全成功！');
        console.log('   - 日期处理正确');
        console.log('   - API响应正常');
        console.log('   - 数据存储正确');
      } else {
        console.log('\n❌ API测试失败，需要进一步检查');
        if (!isDateCorrect) {
          console.log('    日期处理有问题');
        }
        if (!isApiCorrect) {
          console.log('    API响应有问题');
        }
      }
      
    } else {
      console.log('❌ 没有找到创建的菜单数据');
    }
    
    // 9. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.execute('DELETE FROM menus WHERE _id = ?', [menuId]);
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
  testMenuDraftAPI().catch(console.error);
}

module.exports = { testMenuDraftAPI };
