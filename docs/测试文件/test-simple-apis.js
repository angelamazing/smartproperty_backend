const mysql = require('mysql2/promise');
const config = require('./config/database');

/**
 * 简化的API测试脚本
 */

async function testSimpleAPIs() {
  let connection;
  
  try {
    console.log('🚀 开始测试简化的API...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试1: 检查roles表结构
    console.log('\n🧪 测试1: 检查roles表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE roles');
      console.log('✅ roles表结构检查成功');
      console.log('字段数量:', columns.length);
      
      // 显示关键字段
      const keyFields = columns.map(col => col.Field).filter(field => 
        ['_id', 'name', 'description', 'status', 'createTime', 'updateTime'].includes(field)
      );
      console.log('关键字段:', keyFields);
      
    } catch (error) {
      console.log('❌ roles表结构检查失败:', error.message);
    }
    
    // 测试2: 检查dishes表结构
    console.log('\n🧪 测试2: 检查dishes表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dishes');
      console.log('✅ dishes表结构检查成功');
      console.log('字段数量:', columns.length);
      
      // 显示关键字段
      const keyFields = columns.map(col => col.Field).filter(field => 
        ['_id', 'name', 'description', 'price', 'categoryId', 'status'].includes(field)
      );
      console.log('关键字段:', keyFields);
      
    } catch (error) {
      console.log('❌ dishes表结构检查失败:', error.message);
    }
    
    // 测试3: 检查dish_categories表结构
    console.log('\n🧪 测试3: 检查dish_categories表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dish_categories');
      console.log('✅ dish_categories表结构检查成功');
      console.log('字段数量:', columns.length);
      
    } catch (error) {
      console.log('❌ dish_categories表结构检查失败:', error.message);
    }
    
    // 测试4: 尝试创建测试角色
    console.log('\n🧪 测试4: 尝试创建测试角色');
    try {
      const testRoleName = `test_role_${Date.now()}`;
      const createSql = `
        INSERT INTO roles (id, name, description, status, create_time, update_time)
        VALUES (UUID(), ?, ?, 'active', NOW(), NOW())
      `;
      
      const [result] = await connection.execute(createSql, [
        testRoleName,
        '这是一个测试角色'
      ]);
      
      if (result.affectedRows > 0) {
        console.log('✅ 测试角色创建成功');
        
        // 清理测试数据
        await connection.execute(
          'UPDATE roles SET status = "deleted" WHERE name = ?',
          [testRoleName]
        );
        console.log('✅ 测试数据清理成功');
      } else {
        console.log('❌ 测试角色创建失败');
      }
      
    } catch (error) {
      console.log('❌ 测试角色创建失败:', error.message);
    }
    
    // 测试5: 尝试创建测试菜品分类
    console.log('\n🧪 测试5: 尝试创建测试菜品分类');
    try {
      const testCategoryName = `test_category_${Date.now()}`;
      const createSql = `
        INSERT INTO dish_categories (_id, name, description, status, createTime)
        VALUES (UUID(), ?, ?, 'active', NOW())
      `;
      
      const [result] = await connection.execute(createSql, [
        testCategoryName,
        '这是一个测试分类'
      ]);
      
      if (result.affectedRows > 0) {
        console.log('✅ 测试菜品分类创建成功');
        
        // 清理测试数据
        await connection.execute(
          'UPDATE dish_categories SET status = "deleted" WHERE name = ?',
          [testCategoryName]
        );
        console.log('✅ 测试数据清理成功');
      } else {
        console.log('❌ 测试菜品分类创建失败');
      }
      
    } catch (error) {
      console.log('❌ 测试菜品分类创建失败:', error.message);
    }
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testSimpleAPIs();
