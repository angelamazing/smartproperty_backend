const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkMenuDishRelation() {
  let connection;
  
  try {
    console.log('🔍 检查菜单和菜品的关联关系...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查menus表结构
    console.log('\n📋 检查menus表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE menus');
      console.log('menus表字段:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } catch (error) {
      console.log('❌ 检查menus表结构失败:', error.message);
    }
    
    // 检查menu_dishes表结构
    console.log('\n📋 检查menu_dishes表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE menu_dishes');
      console.log('menu_dishes表字段:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } catch (error) {
      console.log('❌ 检查menu_dishes表结构失败:', error.message);
    }
    
    // 检查menus表数据
    console.log('\n📋 检查menus表数据');
    try {
      const [rows] = await connection.execute('SELECT * FROM menus LIMIT 3');
      console.log('menus表数据数量:', rows.length);
      if (rows.length > 0) {
        console.log('第一条菜单记录:', {
          id: rows[0]._id,
          name: rows[0].name,
          publishDate: rows[0].publishDate,
          mealType: rows[0].mealType,
          publishStatus: rows[0].publishStatus,
          dishes: rows[0].dishes
        });
      }
    } catch (error) {
      console.log('❌ 检查menus表数据失败:', error.message);
    }
    
    // 检查menu_dishes表数据
    console.log('\n📋 检查menu_dishes表数据');
    try {
      const [rows] = await connection.execute('SELECT * FROM menu_dishes LIMIT 5');
      console.log('menu_dishes表数据数量:', rows.length);
      if (rows.length > 0) {
        console.log('前几条关联记录:');
        rows.forEach((row, index) => {
          console.log(`  ${index + 1}. MenuID: ${row.menuId}, DishID: ${row.dishId}, Sort: ${row.sort}`);
        });
      }
    } catch (error) {
      console.log('❌ 检查menu_dishes表数据失败:', error.message);
    }
    
    // 检查菜品和菜单的关联查询
    console.log('\n📋 检查菜品和菜单的关联查询');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          m._id as menuId,
          m.name as menuName,
          m.publishDate,
          m.mealType,
          m.publishStatus,
          d._id as dishId,
          d.name as dishName,
          d.price,
          dc.name as categoryName
        FROM menus m
        LEFT JOIN menu_dishes md ON m._id = md.menuId
        LEFT JOIN dishes d ON md.dishId = d._id
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE m.publishStatus = 'published'
        ORDER BY m.publishDate DESC, m.mealType, md.sort
        LIMIT 10
      `);
      
      console.log('关联查询结果数量:', rows.length);
      if (rows.length > 0) {
        console.log('前几条关联记录:');
        rows.forEach((row, index) => {
          console.log(`  ${index + 1}. 菜单: ${row.menuName} (${row.publishDate} ${row.mealType}) - 菜品: ${row.dishName || '无'} (${row.categoryName || '无分类'})`);
        });
      }
    } catch (error) {
      console.log('❌ 关联查询失败:', error.message);
    }
    
    // 检查可用的菜品
    console.log('\n📋 检查可用的菜品');
    try {
      const [rows] = await connection.execute(`
        SELECT 
          d._id,
          d.name,
          d.price,
          d.status,
          dc.name as categoryName
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE d.status = 'active'
        ORDER BY dc.name, d.name
        LIMIT 10
      `);
      
      console.log('可用菜品数量:', rows.length);
      if (rows.length > 0) {
        console.log('前几条菜品记录:');
        rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.name} (${row.categoryName || '无分类'}) - ￥${row.price}`);
        });
      }
    } catch (error) {
      console.log('❌ 检查可用菜品失败:', error.message);
    }
    
    console.log('\n🎉 检查完成！');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
checkMenuDishRelation();
