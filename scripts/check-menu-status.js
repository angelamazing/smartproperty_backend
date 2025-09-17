/**
 * 检查菜单状态
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

class MenuStatusChecker {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(config.database);
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }

  async checkMenuStatus() {
    try {
      console.log('🔍 检查菜单状态...\n');

      // 查询2025-09-23和2025-09-24的菜单
      const [rows] = await this.connection.execute(`
        SELECT 
          _id,
          publishDate,
          mealType,
          publishStatus,
          createTime,
          updateTime
        FROM menus
        WHERE publishDate IN ('2025-09-23', '2025-09-24')
        ORDER BY publishDate, mealType
      `);

      console.log(`📊 找到 ${rows.length} 个菜单记录:\n`);

      const groupedMenus = {};
      rows.forEach(menu => {
        const key = `${menu.publishDate}_${menu.mealType}`;
        if (!groupedMenus[key]) {
          groupedMenus[key] = [];
        }
        groupedMenus[key].push(menu);
      });

      Object.keys(groupedMenus).forEach(key => {
        const [date, mealType] = key.split('_');
        const mealTypeName = mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '中餐' : '晚餐';
        const menus = groupedMenus[key];
        
        console.log(`${date} ${mealTypeName}:`);
        menus.forEach((menu, index) => {
          console.log(`   ${index + 1}. ID: ${menu._id}`);
          console.log(`      状态: ${menu.publishStatus}`);
          console.log(`      创建时间: ${menu.createTime}`);
          console.log(`      更新时间: ${menu.updateTime}`);
        });
        console.log('');
      });

      // 检查是否有已发布的菜单
      const publishedMenus = rows.filter(menu => menu.publishStatus === 'published');
      if (publishedMenus.length > 0) {
        console.log('⚠️  发现已发布的菜单，这些菜单无法被覆盖:');
        publishedMenus.forEach(menu => {
          const mealTypeName = menu.mealType === 'breakfast' ? '早餐' : menu.mealType === 'lunch' ? '中餐' : '晚餐';
          console.log(`   - ${menu.publishDate} ${mealTypeName} (ID: ${menu._id})`);
        });
      }

      // 检查草稿状态的菜单
      const draftMenus = rows.filter(menu => menu.publishStatus === 'draft');
      if (draftMenus.length > 0) {
        console.log('\n📝 发现草稿状态的菜单，这些菜单可以被覆盖:');
        draftMenus.forEach(menu => {
          const mealTypeName = menu.mealType === 'breakfast' ? '早餐' : menu.mealType === 'lunch' ? '中餐' : '晚餐';
          console.log(`   - ${menu.publishDate} ${mealTypeName} (ID: ${menu._id})`);
        });
      }

    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error.message);
    }
  }
}

// 运行检查
async function main() {
  const checker = new MenuStatusChecker();
  
  try {
    await checker.connect();
    await checker.checkMenuStatus();
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await checker.disconnect();
  }
}

main();

