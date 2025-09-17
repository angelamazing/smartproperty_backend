#!/usr/bin/env node

/**
 * 检查menus表结构的脚本
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkMenusTable() {
  let connection;
  
  try {
    console.log('🔍 检查menus表结构...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查表是否存在
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'menus'
    `);
    
    if (tables.length === 0) {
      console.log('❌ menus表不存在');
      return;
    }
    
    console.log('✅ menus表存在');
    
    // 检查表结构
    const [columns] = await connection.execute(`
      DESCRIBE menus
    `);
    
    console.log('\n📋 menus表结构:');
    console.log('字段名 | 类型 | 允许NULL | 键 | 默认值 | 额外');
    console.log('------|------|----------|----|-------|----');
    
    columns.forEach(column => {
      console.log(`${column.Field} | ${column.Type} | ${column.Null} | ${column.Key} | ${column.Default} | ${column.Extra}`);
    });
    
    // 检查时间相关字段
    const timeFields = columns.filter(col => 
      col.Field.includes('Time') || col.Field.includes('time')
    );
    
    console.log('\n⏰ 时间相关字段:');
    if (timeFields.length > 0) {
      timeFields.forEach(field => {
        console.log(`  - ${field.Field}: ${field.Type}`);
      });
    } else {
      console.log('  ❌ 没有找到时间相关字段');
    }
    
    // 检查是否缺少publishTime和effectiveTime字段
    const hasPublishTime = columns.some(col => col.Field === 'publishTime');
    const hasEffectiveTime = columns.some(col => col.Field === 'effectiveTime');
    
    console.log('\n🔍 字段检查:');
    console.log(`  - publishTime: ${hasPublishTime ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`  - effectiveTime: ${hasEffectiveTime ? '✅ 存在' : '❌ 缺失'}`);
    
    if (!hasPublishTime || !hasEffectiveTime) {
      console.log('\n⚠️  需要添加缺失的时间字段');
      console.log('\n建议的SQL语句:');
      
      if (!hasPublishTime) {
        console.log('ALTER TABLE menus ADD COLUMN publishTime TIMESTAMP NULL COMMENT \'发布时间\';');
      }
      
      if (!hasEffectiveTime) {
        console.log('ALTER TABLE menus ADD COLUMN effectiveTime TIMESTAMP NULL COMMENT \'生效时间\';');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
if (require.main === module) {
  checkMenusTable().catch(console.error);
}

module.exports = { checkMenusTable };
