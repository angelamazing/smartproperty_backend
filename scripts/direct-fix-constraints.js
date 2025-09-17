/**
 * 直接修复菜单表约束
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

class DirectConstraintsFixer {
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

  async fixConstraints() {
    try {
      console.log('🔧 直接修复菜单表约束...\n');

      // 1. 查看当前表结构
      console.log('1. 查看当前表结构:');
      const [createTable] = await this.connection.execute(`SHOW CREATE TABLE menus`);
      console.log(createTable[0]['Create Table']);

      // 2. 删除所有唯一约束
      console.log('\n2. 删除所有唯一约束...');
      try {
        await this.connection.execute(`ALTER TABLE menus DROP INDEX uk_date_meal`);
        console.log('   ✅ uk_date_meal约束已删除');
      } catch (e) {
        console.log('   ℹ️ uk_date_meal约束不存在或已删除');
      }

      try {
        await this.connection.execute(`ALTER TABLE menus DROP INDEX mealType`);
        console.log('   ✅ mealType约束已删除');
      } catch (e) {
        console.log('   ℹ️ mealType约束不存在或已删除');
      }

      // 3. 创建正确的约束
      console.log('\n3. 创建正确的约束...');
      await this.connection.execute(`
        ALTER TABLE menus 
        ADD UNIQUE KEY uk_date_meal (publishDate, mealType)
      `);
      console.log('   ✅ uk_date_meal约束已创建');

      // 4. 验证新表结构
      console.log('\n4. 验证新表结构:');
      const [newCreateTable] = await this.connection.execute(`SHOW CREATE TABLE menus`);
      console.log(newCreateTable[0]['Create Table']);

      // 5. 测试插入
      console.log('\n5. 测试插入功能:');
      try {
        const testId = require('uuid').v4();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        // 测试插入2025-09-24早餐
        await this.connection.execute(`
          INSERT INTO menus (_id, publishDate, mealType, publishStatus, createTime, updateTime)
          VALUES (?, '2025-09-24', 'breakfast', 'draft', ?, ?)
        `, [testId, now, now]);
        
        console.log('   ✅ 2025-09-24早餐插入成功');
        
        // 测试插入2025-09-24中餐
        const testId2 = require('uuid').v4();
        await this.connection.execute(`
          INSERT INTO menus (_id, publishDate, mealType, publishStatus, createTime, updateTime)
          VALUES (?, '2025-09-24', 'lunch', 'draft', ?, ?)
        `, [testId2, now, now]);
        
        console.log('   ✅ 2025-09-24中餐插入成功');
        
        // 测试重复插入（应该失败）
        try {
          const testId3 = require('uuid').v4();
          await this.connection.execute(`
            INSERT INTO menus (_id, publishDate, mealType, publishStatus, createTime, updateTime)
            VALUES (?, '2025-09-24', 'breakfast', 'draft', ?, ?)
          `, [testId3, now, now]);
          console.log('   ❌ 重复插入应该失败但没有失败');
        } catch (duplicateError) {
          console.log('   ✅ 重复插入正确失败:', duplicateError.message);
        }
        
        // 清理测试数据
        await this.connection.execute('DELETE FROM menus WHERE _id IN (?, ?)', [testId, testId2]);
        console.log('   🗑️ 测试数据已清理');
        
      } catch (testError) {
        console.log('   ❌ 测试插入失败:', testError.message);
      }

    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error.message);
    }
  }
}

// 运行修复
async function main() {
  const fixer = new DirectConstraintsFixer();
  
  try {
    await fixer.connect();
    await fixer.fixConstraints();
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await fixer.disconnect();
  }
}

main();

