/**
 * 测试 totalAmount 修复功能
 * 验证个人报餐状态API返回的totalAmount是否正确计算
 */

const mysql = require('mysql2/promise');
const moment = require('moment-timezone');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'canteen_management',
  charset: 'utf8mb4'
};

class TotalAmountTest {
  constructor() {
    this.db = null;
  }

  async connect() {
    try {
      this.db = await mysql.createConnection(dbConfig);
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      console.log('✅ 数据库连接已关闭');
    }
  }

  /**
   * 检查现有订单的totalAmount值
   */
  async checkExistingOrders() {
    try {
      console.log('\n📊 检查现有订单的totalAmount值...');
      
      const [orders] = await this.db.execute(`
        SELECT 
          _id as orderId,
          mealType,
          totalAmount,
          diningDate,
          createTime
        FROM dining_orders 
        WHERE diningDate = '2025-09-12'
        ORDER BY createTime DESC
        LIMIT 10
      `);
      
      console.log(`找到 ${orders.length} 个订单:`);
      orders.forEach(order => {
        console.log(`  - 订单ID: ${order.orderId}`);
        console.log(`    餐次: ${order.mealType}`);
        console.log(`    总金额: ${order.totalAmount}`);
        console.log(`    用餐日期: ${order.diningDate}`);
        console.log(`    创建时间: ${order.createTime}`);
        console.log('  ---');
      });
      
      return orders;
    } catch (error) {
      console.error('❌ 检查现有订单失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查菜单和菜品价格
   */
  async checkMenuPrices() {
    try {
      console.log('\n🍽️ 检查菜单和菜品价格...');
      
      const [menus] = await this.db.execute(`
        SELECT 
          m._id as menuId,
          m.publishDate,
          m.mealType,
          m.publishStatus,
          COALESCE(m.name, CONCAT('菜单-', DATE_FORMAT(m.publishDate, '%Y-%m-%d'), '-', 
            CASE m.mealType 
              WHEN 'breakfast' THEN '早餐'
              WHEN 'lunch' THEN '午餐' 
              WHEN 'dinner' THEN '晚餐'
              ELSE m.mealType
            END)) as menuName
        FROM menus m
        WHERE m.publishDate = '2025-09-12' AND m.publishStatus = 'published'
        ORDER BY m.mealType
      `);
      
      console.log(`找到 ${menus.length} 个菜单:`);
      
      for (const menu of menus) {
        console.log(`\n📋 菜单: ${menu.menuName}`);
        console.log(`   ID: ${menu.menuId}`);
        console.log(`   餐次: ${menu.mealType}`);
        console.log(`   状态: ${menu.publishStatus}`);
        
        // 获取菜品价格
        const [dishes] = await this.db.execute(`
          SELECT 
            d._id as dishId,
            d.name as dishName,
            d.price as originalPrice,
            md.price as menuPrice,
            md.sort
          FROM menu_dishes md
          LEFT JOIN dishes d ON md.dishId = d._id
          WHERE md.menuId = ?
          ORDER BY md.sort ASC, d.name ASC
        `, [menu.menuId]);
        
        console.log(`   菜品数量: ${dishes.length}`);
        let totalPrice = 0;
        dishes.forEach(dish => {
          const price = parseFloat(dish.menuPrice) || 0;
          totalPrice += price;
          console.log(`     - ${dish.dishName}: ¥${price} (原价: ¥${dish.originalPrice})`);
        });
        console.log(`   总价格: ¥${totalPrice.toFixed(2)}`);
      }
      
      return menus;
    } catch (error) {
      console.error('❌ 检查菜单价格失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试个人报餐状态API
   */
  async testPersonalStatusAPI() {
    try {
      console.log('\n🔍 测试个人报餐状态API...');
      
      // 模拟API调用 - 直接调用服务方法
      const { DiningService } = require('../services/diningService');
      const diningService = new DiningService();
      
      // 使用一个测试用户ID
      const testUserId = 'e87abd4e-f5ad-4012-926c-bb616b260c6b';
      const testDate = '2025-09-12';
      
      console.log(`测试用户ID: ${testUserId}`);
      console.log(`测试日期: ${testDate}`);
      
      const status = await diningService.getPersonalDiningStatus(testUserId, testDate, this.db);
      
      console.log('\n📊 个人报餐状态结果:');
      console.log(`用户: ${status.userName} (${status.userId})`);
      console.log(`部门: ${status.department}`);
      console.log(`查询日期: ${status.queryDate}`);
      
      console.log('\n🍽️ 餐次状态:');
      Object.entries(status.mealStatus).forEach(([mealType, meal]) => {
        console.log(`\n${mealType.toUpperCase()}:`);
        console.log(`  已报餐: ${meal.isRegistered}`);
        console.log(`  状态: ${meal.statusText}`);
        console.log(`  就餐状态: ${meal.confirmationText}`);
        console.log(`  订单ID: ${meal.orderId}`);
        console.log(`  菜单名称: ${meal.menuName}`);
        console.log(`  总金额: ¥${meal.totalAmount}`);
        console.log(`  菜品数量: ${meal.dishes.length}`);
        if (meal.dishes.length > 0) {
          console.log(`  菜品详情:`);
          meal.dishes.forEach(dish => {
            console.log(`    - ${dish.dishName}: ¥${dish.menuPrice}`);
          });
        }
      });
      
      console.log('\n📈 汇总统计:');
      console.log(`总报餐数: ${status.summary.totalRegistered}`);
      console.log(`总金额: ¥${status.summary.totalAmount}`);
      console.log(`已确认数: ${status.summary.confirmedCount}`);
      console.log(`待确认数: ${status.summary.pendingCount}`);
      console.log(`未报餐数: ${status.summary.unregisteredCount}`);
      console.log(`已就餐数: ${status.summary.diningConfirmedCount}`);
      console.log(`待就餐数: ${status.summary.diningPendingCount}`);
      
      return status;
    } catch (error) {
      console.error('❌ 测试个人报餐状态API失败:', error.message);
      throw error;
    }
  }

  /**
   * 运行完整测试
   */
  async runTest() {
    try {
      console.log('🚀 开始测试 totalAmount 修复功能...\n');
      
      await this.connect();
      
      // 1. 检查现有订单
      await this.checkExistingOrders();
      
      // 2. 检查菜单价格
      await this.checkMenuPrices();
      
      // 3. 测试个人报餐状态API
      await this.testPersonalStatusAPI();
      
      console.log('\n✅ 测试完成！');
      
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
      console.error(error.stack);
    } finally {
      await this.disconnect();
    }
  }
}

// 运行测试
if (require.main === module) {
  const test = new TotalAmountTest();
  test.runTest().catch(console.error);
}

module.exports = TotalAmountTest;
