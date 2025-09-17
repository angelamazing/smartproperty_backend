/**
 * 修复菜单表约束问题
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

class MenuConstraintsFixer {
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
      console.log('🔧 修复菜单表约束问题...\n');

      // 1. 检查当前约束
      console.log('1. 检查当前约束:');
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

      // 2. 检查是否有错误的mealType唯一约束
      const hasMealTypeUnique = constraints.some(c => c.CONSTRAINT_NAME === 'mealType' && c.COLUMN_NAME === 'mealType');
      if (hasMealTypeUnique) {
        console.log('\n❌ 发现错误的mealType唯一约束，需要删除');
        
        // 删除错误的约束
        console.log('2. 删除错误的mealType唯一约束...');
        await this.connection.execute(`ALTER TABLE menus DROP INDEX mealType`);
        console.log('   ✅ mealType唯一约束已删除');
      }

      // 3. 检查是否存在正确的uk_date_meal约束
      const hasCorrectConstraint = constraints.some(c => c.CONSTRAINT_NAME === 'uk_date_meal');
      if (!hasCorrectConstraint) {
        console.log('\n3. 创建正确的uk_date_meal约束...');
        await this.connection.execute(`
          ALTER TABLE menus 
          ADD UNIQUE KEY uk_date_meal (publishDate, mealType)
        `);
        console.log('   ✅ uk_date_meal约束已创建');
      } else {
        console.log('\n✅ uk_date_meal约束已存在');
      }

      // 4. 验证修复结果
      console.log('\n4. 验证修复结果:');
      const [newConstraints] = await this.connection.execute(`
        SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'menus' 
        AND CONSTRAINT_NAME LIKE '%uk_%'
      `);
      
      console.log(`   修复后找到 ${newConstraints.length} 个唯一约束:`);
      newConstraints.forEach(constraint => {
        console.log(`   - ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME}`);
      });

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
  const fixer = new MenuConstraintsFixer();
  
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

