const mysql = require('mysql2/promise');
const config = require('./config/database');
const adminService = require('./services/adminService');

async function testMenuHistoryFix() {
  let pool;
  
  try {
    console.log('🧪 测试菜单历史功能修复...');
    
    // 创建连接池
    pool = mysql.createPool(config.database);
    console.log('✅ 连接池创建成功');
    
    // 测试1: 检查menus表结构
    console.log('\n📋 测试1: 检查menus表结构');
    try {
      const [columns] = await pool.execute('DESCRIBE menus');
      console.log('menus表字段:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
      return;
    }
    
    // 测试2: 测试获取菜单历史
    console.log('\n📋 测试2: 测试获取菜单历史');
    try {
      const result = await adminService.getMenuHistory(pool, {
        page: 1,
        pageSize: 5,
        filters: {
          startDate: '2025-08-23',
          endDate: '2025-08-30'
        }
      });
      
      console.log('✅ 获取菜单历史成功:');
      console.log(`  - 总数: ${result.total}`);
      console.log(`  - 当前页: ${result.page}`);
      console.log(`  - 每页数量: ${result.pageSize}`);
      console.log(`  - 总页数: ${result.totalPages}`);
      console.log(`  - 数据条数: ${result.list.length}`);
      
      if (result.list.length > 0) {
        console.log('\n前3条菜单数据:');
        result.list.slice(0, 3).forEach((menu, index) => {
          console.log(`  ${index + 1}. ID: ${menu._id}, 日期: ${menu.publishDate}, 餐次: ${menu.mealType}, 状态: ${menu.publishStatus}`);
        });
      }
      
    } catch (error) {
      console.log('❌ 获取菜单历史失败:', error.message);
      
      // 尝试更简单的查询来定位问题
      console.log('\n📋 尝试简单查询定位问题');
      try {
        const [simpleResult] = await pool.execute('SELECT COUNT(*) as total FROM menus');
        console.log('✅ 简单查询成功，总数:', simpleResult[0].total);
        
        if (simpleResult[0].total > 0) {
          const [sampleData] = await pool.execute('SELECT * FROM menus LIMIT 1');
          console.log('✅ 获取示例数据成功');
          console.log('示例数据字段:', Object.keys(sampleData[0]));
        }
        
      } catch (simpleError) {
        console.log('❌ 简单查询也失败:', simpleError.message);
      }
    }
    
    // 测试3: 测试不同的过滤条件
    console.log('\n📋 测试3: 测试不同的过滤条件');
    try {
      // 测试无过滤条件
      const result1 = await adminService.getMenuHistory(pool, {
        page: 1,
        pageSize: 3,
        filters: {}
      });
      console.log('✅ 无过滤条件查询成功，总数:', result1.total);
      
      // 测试只有餐次过滤
      const result2 = await adminService.getMenuHistory(pool, {
        page: 1,
        pageSize: 3,
        filters: {
          mealType: 'lunch'
        }
      });
      console.log('✅ 餐次过滤查询成功，总数:', result2.total);
      
    } catch (error) {
      console.log('❌ 过滤条件测试失败:', error.message);
    }
    
    console.log('\n🎉 菜单历史功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔌 连接池已关闭');
    }
  }
}

// 运行测试
testMenuHistoryFix();
