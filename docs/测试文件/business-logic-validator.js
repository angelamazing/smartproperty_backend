const mysql = require('mysql2/promise');
const config = require('./config/database');

/**
 * 业务逻辑全面验证脚本
 * 检查核心业务功能的逻辑正确性
 */
async function validateBusinessLogic() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    console.log('🔗 数据库连接成功\n');
    
    // 1. 用户管理业务逻辑
    console.log('👥 第一步：用户管理业务逻辑验证');
    await validateUserManagement(connection);
    
    // 2. 菜品管理业务逻辑
    console.log('\n🍽️  第二步：菜品管理业务逻辑验证');
    await validateDishManagement(connection);
    
    // 3. 菜单管理业务逻辑
    console.log('\n📋 第三步：菜单管理业务逻辑验证');
    await validateMenuManagement(connection);
    
    // 4. 报餐业务逻辑
    console.log('\n🍴 第四步：报餐业务逻辑验证');
    await validateDiningBusiness(connection);
    
    // 5. 场地预约业务逻辑
    console.log('\n🏟️  第五步：场地预约业务逻辑验证');
    await validateVenueReservation(connection);
    
    // 6. 权限控制业务逻辑
    console.log('\n🔐 第六步：权限控制业务逻辑验证');
    await validatePermissionControl(connection);
    
    // 7. 数据一致性业务逻辑
    console.log('\n🔗 第七步：数据一致性业务逻辑验证');
    await validateDataConsistency(connection);
    
  } catch (error) {
    console.error('❌ 业务逻辑验证失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 验证用户管理业务逻辑
 */
async function validateUserManagement(connection) {
  try {
    console.log('  检查用户角色分配:');
    
    // 检查用户角色分布
    const [roleStats] = await connection.execute(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);
    
    roleStats.forEach(stat => {
      console.log(`    ${stat.role}: ${stat.count} 人`);
    });
    
    // 检查部门用户关联
    console.log('  检查部门用户关联:');
    const [deptUserStats] = await connection.execute(`
      SELECT d.name as deptName, COUNT(u._id) as userCount
      FROM departments d
      LEFT JOIN users u ON d._id = u.departmentId
      GROUP BY d._id, d.name
    `);
    
    deptUserStats.forEach(stat => {
      console.log(`    ${stat.deptName}: ${stat.userCount} 人`);
    });
    
    // 检查测试用户标识
    console.log('  检查测试用户标识:');
    const [testUsers] = await connection.execute(`
      SELECT COUNT(*) as count FROM users WHERE isTestUser = TRUE
    `);
    console.log(`    测试用户数量: ${testUsers[0].count}`);
    
    // 检查用户状态
    console.log('  检查用户状态:');
    const [statusStats] = await connection.execute(`
      SELECT status, COUNT(*) as count FROM users GROUP BY status
    `);
    
    statusStats.forEach(stat => {
      console.log(`    ${stat.status}: ${stat.count} 人`);
    });
    
  } catch (error) {
    console.log(`  ❌ 用户管理验证失败: ${error.message}`);
  }
}

/**
 * 验证菜品管理业务逻辑
 */
async function validateDishManagement(connection) {
  try {
    console.log('  检查菜品分类:');
    
    // 检查菜品分类分布
    const [categoryStats] = await connection.execute(`
      SELECT dc.name as categoryName, COUNT(d._id) as dishCount
      FROM dish_categories dc
      LEFT JOIN dishes d ON dc._id = d.categoryId
      GROUP BY dc._id, dc.name
    `);
    
    categoryStats.forEach(stat => {
      console.log(`    ${stat.categoryName}: ${stat.dishCount} 个菜品`);
    });
    
    // 检查菜品状态
    console.log('  检查菜品状态:');
    const [dishStatusStats] = await connection.execute(`
      SELECT status, COUNT(*) as count FROM dishes GROUP BY status
    `);
    
    dishStatusStats.forEach(stat => {
      console.log(`    ${stat.status}: ${stat.count} 个菜品`);
    });
    
    // 检查推荐菜品
    console.log('  检查推荐菜品:');
    const [recommendedDishes] = await connection.execute(`
      SELECT COUNT(*) as count FROM dishes WHERE isRecommended = TRUE
    `);
    console.log(`    推荐菜品数量: ${recommendedDishes[0].count}`);
    
    // 检查菜品价格分布
    console.log('  检查菜品价格分布:');
    const [priceStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN price < 10 THEN '0-10元'
          WHEN price < 20 THEN '10-20元'
          WHEN price < 30 THEN '20-30元'
          ELSE '30元以上'
        END as priceRange,
        COUNT(*) as count
      FROM dishes 
      GROUP BY priceRange
      ORDER BY MIN(price)
    `);
    
    priceStats.forEach(stat => {
      console.log(`    ${stat.priceRange}: ${stat.count} 个菜品`);
    });
    
  } catch (error) {
    console.log(`  ❌ 菜品管理验证失败: ${error.message}`);
  }
}

/**
 * 验证菜单管理业务逻辑
 */
async function validateMenuManagement(connection) {
  try {
    console.log('  检查菜单发布状态:');
    
    // 检查菜单状态分布
    const [menuStatusStats] = await connection.execute(`
      SELECT publishStatus, COUNT(*) as count FROM menus GROUP BY publishStatus
    `);
    
    menuStatusStats.forEach(stat => {
      console.log(`    ${stat.publishStatus}: ${stat.count} 个菜单`);
    });
    
    // 检查餐次分布
    console.log('  检查餐次分布:');
    const [mealTypeStats] = await connection.execute(`
      SELECT mealType, COUNT(*) as count FROM menus GROUP BY mealType
    `);
    
    mealTypeStats.forEach(stat => {
      console.log(`    ${stat.mealType}: ${stat.count} 个菜单`);
    });
    
    // 检查菜单菜品关联
    console.log('  检查菜单菜品关联:');
    const [menuDishStats] = await connection.execute(`
      SELECT m.publishDate, m.mealType, COUNT(md.dishId) as dishCount
      FROM menus m
      LEFT JOIN menu_dishes md ON m._id = md.menuId
      GROUP BY m._id, m.publishDate, m.mealType
    `);
    
    menuDishStats.forEach(stat => {
      console.log(`    ${stat.publishDate} ${stat.mealType}: ${stat.dishCount} 个菜品`);
    });
    
    // 检查菜单容量设置
    console.log('  检查菜单容量设置:');
    const [capacityStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN capacity = 0 THEN '未设置'
          WHEN capacity < 50 THEN '50人以下'
          WHEN capacity < 100 THEN '50-100人'
          ELSE '100人以上'
        END as capacityRange,
        COUNT(*) as count
      FROM menus 
      GROUP BY capacityRange
    `);
    
    capacityStats.forEach(stat => {
      console.log(`    ${stat.capacityRange}: ${stat.count} 个菜单`);
    });
    
  } catch (error) {
    console.log(`  ❌ 菜单管理验证失败: ${error.message}`);
  }
}

/**
 * 验证报餐业务逻辑
 */
async function validateDiningBusiness(connection) {
  try {
    console.log('  检查报餐订单状态:');
    
    // 检查订单状态分布
    const [orderStatusStats] = await connection.execute(`
      SELECT status, COUNT(*) as count FROM dining_orders GROUP BY status
    `);
    
    orderStatusStats.forEach(stat => {
      console.log(`    ${stat.status}: ${stat.count} 个订单`);
    });
    
    // 检查餐次分布
    console.log('  检查餐次分布:');
    const [mealTypeStats] = await connection.execute(`
      SELECT mealType, COUNT(*) as count FROM dining_orders GROUP BY mealType
    `);
    
    mealTypeStats.forEach(stat => {
      console.log(`    ${stat.mealType}: ${stat.count} 个订单`);
    });
    
    // 检查报餐人数分布
    console.log('  检查报餐人数分布:');
    const [memberCountStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN memberCount = 1 THEN '1人'
          WHEN memberCount <= 5 THEN '2-5人'
          WHEN memberCount <= 10 THEN '6-10人'
          ELSE '10人以上'
        END as memberRange,
        COUNT(*) as count
      FROM dining_orders 
      GROUP BY memberRange
      ORDER BY MIN(memberCount)
    `);
    
    memberCountStats.forEach(stat => {
      console.log(`    ${stat.memberRange}: ${stat.count} 个订单`);
    });
    
    // 检查部门报餐情况
    console.log('  检查部门报餐情况:');
    const [deptOrderStats] = await connection.execute(`
      SELECT d.name as deptName, COUNT(do._id) as orderCount
      FROM departments d
      LEFT JOIN dining_orders do ON d._id = do.deptId
      GROUP BY d._id, d.name
    `);
    
    deptOrderStats.forEach(stat => {
      console.log(`    ${stat.deptName}: ${stat.orderCount} 个订单`);
    });
    
  } catch (error) {
    console.log(`  ❌ 报餐业务验证失败: ${error.message}`);
  }
}

/**
 * 验证场地预约业务逻辑
 */
async function validateVenueReservation(connection) {
  try {
    console.log('  检查场地信息:');
    
    // 检查场地类型分布
    const [venueTypeStats] = await connection.execute(`
      SELECT type, COUNT(*) as count FROM venues GROUP BY type
    `);
    
    venueTypeStats.forEach(stat => {
      console.log(`    ${stat.type}: ${stat.count} 个场地`);
    });
    
    // 检查场地容量分布
    console.log('  检查场地容量分布:');
    const [capacityStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN capacity <= 4 THEN '4人以下'
          WHEN capacity <= 8 THEN '5-8人'
          WHEN capacity <= 15 THEN '9-15人'
          ELSE '15人以上'
        END as capacityRange,
        COUNT(*) as count
      FROM venues 
      GROUP BY capacityRange
      ORDER BY MIN(capacity)
    `);
    
    capacityStats.forEach(stat => {
      console.log(`    ${stat.capacityRange}: ${stat.count} 个场地`);
    });
    
    // 检查预约状态
    console.log('  检查预约状态:');
    const [reservationStatusStats] = await connection.execute(`
      SELECT status, COUNT(*) as count FROM reservations GROUP BY status
    `);
    
    if (reservationStatusStats.length > 0) {
      reservationStatusStats.forEach(stat => {
        console.log(`    ${stat.status}: ${stat.count} 个预约`);
      });
    } else {
      console.log('    暂无预约记录');
    }
    
  } catch (error) {
    console.log(`  ❌ 场地预约验证失败: ${error.message}`);
  }
}

/**
 * 验证权限控制业务逻辑
 */
async function validatePermissionControl(connection) {
  try {
    console.log('  检查角色权限:');
    
    // 检查角色分布
    const [roleStats] = await connection.execute(`
      SELECT name, COUNT(*) as count FROM roles GROUP BY name
    `);
    
    roleStats.forEach(stat => {
      console.log(`    ${stat.name}: ${stat.count} 个`);
    });
    
    // 检查权限分类
    console.log('  检查权限分类:');
    const [permissionCategoryStats] = await connection.execute(`
      SELECT category, COUNT(*) as count FROM permissions GROUP BY category
    `);
    
    permissionCategoryStats.forEach(stat => {
      console.log(`    ${stat.category}: ${stat.stat} 个权限`);
    });
    
    // 检查用户令牌
    console.log('  检查用户令牌:');
    const [tokenStats] = await connection.execute(`
      SELECT 
        CASE 
          WHEN expireTime < NOW() THEN '已过期'
          ELSE '有效'
        END as tokenStatus,
        COUNT(*) as count
      FROM user_tokens 
      GROUP BY tokenStatus
    `);
    
    tokenStats.forEach(stat => {
      console.log(`    ${stat.tokenStatus}: ${stat.count} 个令牌`);
    });
    
  } catch (error) {
    console.log(`  ❌ 权限控制验证失败: ${error.message}`);
  }
}

/**
 * 验证数据一致性业务逻辑
 */
async function validateDataConsistency(connection) {
  try {
    console.log('  检查数据引用完整性:');
    
    // 检查孤立用户
    const [orphanUsers] = await connection.execute(`
      SELECT COUNT(*) as count FROM users u 
      LEFT JOIN departments d ON u.departmentId = d._id 
      WHERE u.departmentId IS NOT NULL AND d._id IS NULL
    `);
    
    if (orphanUsers[0].count > 0) {
      console.log(`    ⚠️  发现 ${orphanUsers[0].count} 个孤立用户`);
    } else {
      console.log('    ✅ 用户部门关联完整');
    }
    
    // 检查孤立菜品
    const [orphanDishes] = await connection.execute(`
      SELECT COUNT(*) as count FROM dishes d 
      LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
      WHERE d.categoryId IS NOT NULL AND dc._id IS NULL
    `);
    
    if (orphanDishes[0].count > 0) {
      console.log(`    ⚠️  发现 ${orphanDishes[0].count} 个孤立菜品`);
    } else {
      console.log('    ✅ 菜品分类关联完整');
    }
    
    // 检查孤立菜单菜品
    const [orphanMenuDishes] = await connection.execute(`
      SELECT COUNT(*) as count FROM menu_dishes md 
      LEFT JOIN menus m ON md.menuId = m._id 
      WHERE m._id IS NULL
    `);
    
    if (orphanMenuDishes[0].count > 0) {
      console.log(`    ⚠️  发现 ${orphanMenuDishes[0].count} 个孤立菜单菜品关联`);
    } else {
      console.log('    ✅ 菜单菜品关联完整');
    }
    
    // 检查孤立报餐订单
    const [orphanOrders] = await connection.execute(`
      SELECT COUNT(*) as count FROM dining_orders do 
      LEFT JOIN users u ON do.registrantId = u._id 
      WHERE u._id IS NULL
    `);
    
    if (orphanOrders[0].count > 0) {
      console.log(`    ⚠️  发现 ${orphanOrders[0].count} 个孤立报餐订单`);
    } else {
      console.log('    ✅ 报餐订单用户关联完整');
    }
    
  } catch (error) {
    console.log(`  ❌ 数据一致性验证失败: ${error.message}`);
  }
}

// 运行验证
console.log('🚀 开始业务逻辑全面验证...\n');
validateBusinessLogic();
