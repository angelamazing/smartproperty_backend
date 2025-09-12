const mysql = require('mysql2/promise');
const config = require('./config/database');
const logger = require('./utils/logger');

/**
 * 测试菜品和角色管理接口
 */

class APITester {
  constructor() {
    this.db = null;
    this.testResults = [];
  }

  async init() {
    try {
      this.db = await mysql.createConnection(config.database);
      logger.info('数据库连接成功');
    } catch (error) {
      logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await this.db.end();
      logger.info('数据库连接已关闭');
    }
  }

  logTestResult(testName, success, message, data = null) {
    const result = {
      testName,
      success,
      message,
      timestamp: new Date().toISOString(),
      data
    };
    
    this.testResults.push(result);
    
    if (success) {
      logger.info(`✅ ${testName}: ${message}`);
    } else {
      logger.error(`❌ ${testName}: ${message}`);
    }
    
    return result;
  }

  async testDishCategories() {
    logger.info('🧪 开始测试菜品分类功能...');
    
    try {
      // 测试创建菜品分类
      const categoryData = {
        name: '测试分类',
        description: '这是一个测试分类',
        icon: '🍽️',
        sort: 999
      };
      
      const createSql = `
        INSERT INTO dish_categories (
          _id, name, description, icon, sort, status, createTime
        ) VALUES (UUID(), ?, ?, ?, ?, 'active', NOW())
      `;
      
      const [createResult] = await this.db.execute(createSql, [
        categoryData.name,
        categoryData.description,
        categoryData.icon,
        categoryData.sort
      ]);
      
      if (createResult.affectedRows > 0) {
        this.logTestResult('创建菜品分类', true, '菜品分类创建成功');
        
        // 测试查询菜品分类
        const querySql = `
          SELECT * FROM dish_categories 
          WHERE name = ? AND status = 'active'
        `;
        
        const [categories] = await this.db.execute(querySql, [categoryData.name]);
        
        if (categories.length > 0) {
          this.logTestResult('查询菜品分类', true, '菜品分类查询成功', categories[0]);
          
          // 清理测试数据
          const deleteSql = `
            UPDATE dish_categories 
            SET status = 'deleted' 
            WHERE name = ?
          `;
          
          await this.db.execute(deleteSql, [categoryData.name]);
          this.logTestResult('清理测试数据', true, '测试数据清理成功');
        } else {
          this.logTestResult('查询菜品分类', false, '菜品分类查询失败');
        }
      } else {
        this.logTestResult('创建菜品分类', false, '菜品分类创建失败');
      }
      
    } catch (error) {
      this.logTestResult('菜品分类测试', false, `测试过程中发生错误: ${error.message}`);
    }
  }

  async testDishes() {
    logger.info('🧪 开始测试菜品功能...');
    
    try {
      // 先创建一个测试分类
      const categorySql = `
        INSERT INTO dish_categories (
          _id, name, description, icon, sort, status, createTime
        ) VALUES (UUID(), '测试分类', '测试用分类', '🍽️', 999, 'active', NOW())
      `;
      
      const [categoryResult] = await this.db.execute(categorySql);
      let categoryId = null;
      
      if (categoryResult.insertId) {
        // 获取分类ID
        const [categories] = await this.db.execute(
          'SELECT _id FROM dish_categories WHERE name = ? AND status = "active"',
          ['测试分类']
        );
        
        if (categories.length > 0) {
          categoryId = categories[0]._id;
          
          // 测试创建菜品
                     const dishData = {
             name: '测试菜品',
             description: '这是一个测试菜品',
             price: 25.50,
             categoryId: categoryId,
             image: 'https://example.com/test-dish.jpg',
             tags: JSON.stringify(['测试', '新品']),
             status: 'active'
           };
          
                     const createDishSql = `
             INSERT INTO dishes (
               _id, name, description, price, categoryId, image, tags, status, createTime, updateTime
             ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
           `;
          
                     const [dishResult] = await this.db.execute(createDishSql, [
             dishData.name,
             dishData.description,
             dishData.price,
             dishData.categoryId,
             dishData.image,
             dishData.tags,
             dishData.status
           ]);
          
          if (dishResult.affectedRows > 0) {
            this.logTestResult('创建菜品', true, '菜品创建成功');
            
            // 测试查询菜品
            const queryDishSql = `
              SELECT d.*, dc.name as categoryName
              FROM dishes d
              LEFT JOIN dish_categories dc ON d.categoryId = dc._id
              WHERE d.name = ? AND d.status = 'active'
            `;
            
            const [dishes] = await this.db.execute(queryDishSql, [dishData.name]);
            
            if (dishes.length > 0) {
              this.logTestResult('查询菜品', true, '菜品查询成功', dishes[0]);
              
              // 清理测试数据
              await this.db.execute(
                'UPDATE dishes SET status = "deleted" WHERE name = ?',
                [dishData.name]
              );
              
              await this.db.execute(
                'UPDATE dish_categories SET status = "deleted" WHERE name = ?',
                ['测试分类']
              );
              
              this.logTestResult('清理测试数据', true, '菜品测试数据清理成功');
            } else {
              this.logTestResult('查询菜品', false, '菜品查询失败');
            }
          } else {
            this.logTestResult('创建菜品', false, '菜品创建失败');
          }
        }
      }
      
    } catch (error) {
      this.logTestResult('菜品测试', false, `测试过程中发生错误: ${error.message}`);
    }
  }

  async testRoles() {
    logger.info('🧪 开始测试角色功能...');
    
    try {
      // 测试创建角色
             const roleData = {
         name: `测试角色_${Date.now()}`,
         description: '这是一个测试角色',
         status: 'active'
       };
      
             const createRoleSql = `
         INSERT INTO roles (
           id, name, description, status, create_time, update_time
         ) VALUES (UUID(), ?, ?, ?, NOW(), NOW())
       `;
      
             const [roleResult] = await this.db.execute(createRoleSql, [
         roleData.name,
         roleData.description,
         roleData.status
       ]);
      
      if (roleResult.affectedRows > 0) {
        this.logTestResult('创建角色', true, '角色创建成功');
        
        // 测试查询角色
        const queryRoleSql = `
          SELECT * FROM roles 
          WHERE name = ? AND status = 'active'
        `;
        
        const [roles] = await this.db.execute(queryRoleSql, [roleData.name]);
        
        if (roles.length > 0) {
          this.logTestResult('查询角色', true, '角色查询成功', roles[0]);
          
          // 清理测试数据
          await this.db.execute(
            'UPDATE roles SET status = "deleted" WHERE name = ?',
            [roleData.name]
          );
          
          this.logTestResult('清理测试数据', true, '角色测试数据清理成功');
        } else {
          this.logTestResult('查询角色', false, '角色查询失败');
        }
      } else {
        this.logTestResult('创建角色', false, '角色创建失败');
      }
      
    } catch (error) {
      this.logTestResult('角色测试', false, `测试过程中发生错误: ${error.message}`);
    }
  }

  async runAllTests() {
    logger.info('🚀 开始运行所有测试...');
    
    try {
      await this.testDishCategories();
      await this.testDishes();
      await this.testRoles();
      
      // 输出测试结果摘要
      this.printTestSummary();
      
    } catch (error) {
      logger.error('测试运行失败:', error);
    }
  }

  printTestSummary() {
    logger.info('\n📊 测试结果摘要:');
    logger.info('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    logger.info(`总测试数: ${totalTests}`);
    logger.info(`通过: ${passedTests} ✅`);
    logger.info(`失败: ${failedTests} ❌`);
    logger.info(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    
    if (failedTests > 0) {
      logger.info('\n❌ 失败的测试:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          logger.error(`  - ${result.testName}: ${result.message}`);
        });
    }
    
    logger.info('='.repeat(50));
  }
}

// 主函数
async function main() {
  const tester = new APITester();
  
  try {
    await tester.init();
    await tester.runAllTests();
  } catch (error) {
    logger.error('测试执行失败:', error);
  } finally {
    await tester.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = APITester;
