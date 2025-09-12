const mysql = require('mysql2/promise');
const config = require('./config/database');
const logger = require('./utils/logger');

/**
 * 创建测试菜单
 */

// 提取数据库配置
const dbConfig = config.database;

async function createTestMenu() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始创建测试菜单...');

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    logger.info(`创建日期: ${today}`);

    // 创建午餐菜单
    const lunchMenu = {
      _id: require('uuid').v4(),
      publishDate: today,
      mealType: 'lunch',
      mealTime: '12:00-13:00',
      dishes: JSON.stringify([
        {
          id: 'dish1',
          name: '宫保鸡丁',
          category: '主菜',
          price: 15.00,
          description: '经典川菜，鸡肉嫩滑，花生香脆'
        },
        {
          id: 'dish2',
          name: '麻婆豆腐',
          category: '主菜',
          price: 12.00,
          description: '麻辣鲜香，豆腐嫩滑'
        },
        {
          id: 'dish3',
          name: '白米饭',
          category: '主食',
          price: 2.00,
          description: '优质大米，粒粒饱满'
        },
        {
          id: 'dish4',
          name: '紫菜蛋花汤',
          category: '汤品',
          price: 5.00,
          description: '清淡鲜美，营养丰富'
        }
      ]),
      publishStatus: 'published',
      publisherId: '12e4db1e-8ff5-4c68-a7ed-8e239885f401', // 部门管理员测试的ID
      name: '今日午餐',
      description: '营养丰富的午餐套餐',
      price: 34.00,
      capacity: 100,
      currentOrders: 0,
      createTime: new Date(),
      updateTime: new Date()
    };

    // 检查是否已存在今日午餐菜单
    const [existingLunch] = await connection.execute(
      'SELECT _id FROM menus WHERE publishDate = ? AND mealType = ?',
      [today, 'lunch']
    );

    if (existingLunch.length > 0) {
      logger.info('今日午餐菜单已存在，跳过创建');
    } else {
      await connection.execute(`
        INSERT INTO menus (_id, publishDate, mealType, mealTime, dishes, publishStatus, publisherId, name, description, price, capacity, currentOrders, createTime, updateTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        lunchMenu._id,
        lunchMenu.publishDate,
        lunchMenu.mealType,
        lunchMenu.mealTime,
        lunchMenu.dishes,
        lunchMenu.publishStatus,
        lunchMenu.publisherId,
        lunchMenu.name,
        lunchMenu.description,
        lunchMenu.price,
        lunchMenu.capacity,
        lunchMenu.currentOrders,
        lunchMenu.createTime,
        lunchMenu.updateTime
      ]);
      logger.info('今日午餐菜单创建成功');
    }

    // 创建晚餐菜单
    const dinnerMenu = {
      _id: require('uuid').v4(),
      publishDate: today,
      mealType: 'dinner',
      mealTime: '18:00-19:00',
      dishes: JSON.stringify([
        {
          id: 'dish5',
          name: '红烧肉',
          category: '主菜',
          price: 18.00,
          description: '肥瘦相间，入口即化'
        },
        {
          id: 'dish6',
          name: '清炒小白菜',
          category: '素菜',
          price: 8.00,
          description: '清爽可口，营养健康'
        },
        {
          id: 'dish7',
          name: '白米饭',
          category: '主食',
          price: 2.00,
          description: '优质大米，粒粒饱满'
        },
        {
          id: 'dish8',
          name: '冬瓜排骨汤',
          category: '汤品',
          price: 6.00,
          description: '清热解腻，营养丰富'
        }
      ]),
      publishStatus: 'published',
      publisherId: '12e4db1e-8ff5-4c68-a7ed-8e239885f401', // 部门管理员测试的ID
      name: '今日晚餐',
      description: '营养丰富的晚餐套餐',
      price: 34.00,
      capacity: 100,
      currentOrders: 0,
      createTime: new Date(),
      updateTime: new Date()
    };

    // 检查是否已存在今日晚餐菜单
    const [existingDinner] = await connection.execute(
      'SELECT _id FROM menus WHERE publishDate = ? AND mealType = ?',
      [today, 'dinner']
    );

    if (existingDinner.length > 0) {
      logger.info('今日晚餐菜单已存在，跳过创建');
    } else {
      await connection.execute(`
        INSERT INTO menus (_id, publishDate, mealType, mealTime, dishes, publishStatus, publisherId, name, description, price, capacity, currentOrders, createTime, updateTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dinnerMenu._id,
        dinnerMenu.publishDate,
        dinnerMenu.mealType,
        dinnerMenu.mealTime,
        dinnerMenu.dishes,
        dinnerMenu.publishStatus,
        dinnerMenu.publisherId,
        dinnerMenu.name,
        dinnerMenu.description,
        dinnerMenu.price,
        dinnerMenu.capacity,
        dinnerMenu.currentOrders,
        dinnerMenu.createTime,
        dinnerMenu.updateTime
      ]);
      logger.info('今日晚餐菜单创建成功');
    }

    // 显示创建的菜单
    const [menus] = await connection.execute(
      'SELECT _id, publishDate, mealType, publishStatus FROM menus WHERE publishDate = ? ORDER BY mealType',
      [today]
    );

    logger.info('\n今日菜单列表:');
    menus.forEach(menu => {
      logger.info(`- ${menu.mealType} (${menu.publishStatus}): ${menu._id}`);
    });

  } catch (error) {
    logger.error('创建测试菜单失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await createTestMenu();
    logger.info('测试菜单创建完成！');
  } catch (error) {
    logger.error('创建测试菜单失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createTestMenu
};