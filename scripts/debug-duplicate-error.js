/**
 * 调试重复错误
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

class DuplicateErrorAnalyzer {
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

  async debugDuplicateError() {
    try {
      console.log('🔍 调试重复错误...\n');

      // 1. 检查所有菜单记录
      console.log('1. 检查所有菜单记录:');
      const [allMenus] = await this.connection.execute(`
        SELECT 
          _id,
          publishDate,
          mealType,
          publishStatus,
          createTime
        FROM menus
        WHERE publishDate >= '2025-09-20'
        ORDER BY publishDate, mealType
      `);
      
      console.log(`   找到 ${allMenus.length} 个菜单记录`);
      allMenus.forEach(menu => {
        const mealTypeName = menu.mealType === 'breakfast' ? '早餐' : menu.mealType === 'lunch' ? '中餐' : '晚餐';
        console.log(`   - ${menu.publishDate} ${mealTypeName} (${menu.publishStatus}) - ${menu._id}`);
      });

      // 2. 检查2025-09-24的具体记录
      console.log('\n2. 检查2025-09-24的具体记录:');
      const [sep24Menus] = await this.connection.execute(`
        SELECT 
          _id,
          publishDate,
          mealType,
          publishStatus,
          createTime
        FROM menus
        WHERE publishDate = '2025-09-24'
        ORDER BY mealType
      `);
      
      console.log(`   2025-09-24 有 ${sep24Menus.length} 个菜单记录`);
      sep24Menus.forEach(menu => {
        const mealTypeName = menu.mealType === 'breakfast' ? '早餐' : menu.mealType === 'lunch' ? '中餐' : '晚餐';
        console.log(`   - ${menu.mealType} (${mealTypeName}) - ${menu._id} - ${menu.publishStatus}`);
      });

      // 3. 检查数据库约束
      console.log('\n3. 检查数据库约束:');
      const [constraints] = await this.connection.execute(`
        SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'menus' 
        AND CONSTRAINT_NAME LIKE '%uk_%'
      `);
      
      console.log(`   找到 ${constraints.length} 个唯一约束:`);
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME}`);
      });

      // 4. 尝试手动插入测试数据
      console.log('\n4. 尝试手动插入测试数据:');
      try {
        const testId = require('uuid').v4();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        await this.connection.execute(`
          INSERT INTO menus (_id, publishDate, mealType, publishStatus, createTime, updateTime)
          VALUES (?, '2025-09-24', 'breakfast', 'draft', ?, ?)
        `, [testId, now, now]);
        
        console.log('   ✅ 手动插入成功，说明没有重复');
        
        // 删除测试数据
        await this.connection.execute('DELETE FROM menus WHERE _id = ?', [testId]);
        console.log('   🗑️ 测试数据已删除');
        
      } catch (insertError) {
        console.log('   ❌ 手动插入失败:', insertError.message);
      }

      // 5. 检查是否有软删除或其他隐藏字段
      console.log('\n5. 检查表结构:');
      const [columns] = await this.connection.execute(`
        DESCRIBE menus
      `);
      
      console.log('   表结构:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });

    } catch (error) {
      console.error('❌ 调试过程中发生错误:', error.message);
    }
  }
}

// 运行调试
async function main() {
  const analyzer = new DuplicateErrorAnalyzer();
  
  try {
    await analyzer.connect();
    await analyzer.debugDuplicateError();
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await analyzer.disconnect();
  }
}

main();
