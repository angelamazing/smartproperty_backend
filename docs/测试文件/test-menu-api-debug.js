const adminService = require('./services/adminService');
const config = require('./config/database');
const mysql = require('mysql2/promise');

async function debugMenuAPI() {
  const connection = await mysql.createConnection(config.database);
  
  try {
    console.log('=== 调试菜单API ===');
    
    // 测试1: 检查数据库连接
    console.log('\n1. 测试数据库连接...');
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('✅ 数据库连接正常:', result[0].test);
    
    // 测试2: 检查menus表结构
    console.log('\n2. 检查menus表结构...');
    const [columns] = await connection.query('DESCRIBE menus');
    console.log('menus表字段:', columns.map(row => row.Field));
    
    // 测试3: 检查users表结构
    console.log('\n3. 检查users表结构...');
    const [userColumns] = await connection.query('DESCRIBE users');
    console.log('users表字段:', userColumns.map(row => row.Field));
    
    // 测试4: 直接测试getMenuHistory
    console.log('\n4. 测试getMenuHistory方法...');
    try {
      const menuResult = await adminService.getMenuHistory(connection, {
        page: 1,
        pageSize: 10,
        filters: {}
      });
      console.log('✅ getMenuHistory成功:', menuResult);
    } catch (error) {
      console.error('❌ getMenuHistory失败:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    
    // 测试5: 直接测试getMenuTemplates
    console.log('\n5. 测试getMenuTemplates方法...');
    try {
      const templateResult = await adminService.getMenuTemplates(connection);
      console.log('✅ getMenuTemplates成功:', templateResult);
    } catch (error) {
      console.error('❌ getMenuTemplates失败:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    await connection.end();
  }
}

debugMenuAPI();
