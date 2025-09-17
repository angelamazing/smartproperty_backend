#!/usr/bin/env node

/**
 * 修复menus表结构，添加缺失的时间字段
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

async function fixMenusTableSchema() {
  let connection;
  
  try {
    console.log('🔧 开始修复menus表结构...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 开始事务
    await connection.beginTransaction();
    
    try {
      // 1. 添加 publishTime 字段
      console.log('📝 添加 publishTime 字段...');
      await connection.execute(`
        ALTER TABLE menus 
        ADD COLUMN publishTime TIMESTAMP NULL COMMENT '发布时间'
      `);
      console.log('✅ publishTime 字段添加成功');
      
      // 2. 添加 effectiveTime 字段
      console.log('📝 添加 effectiveTime 字段...');
      await connection.execute(`
        ALTER TABLE menus 
        ADD COLUMN effectiveTime TIMESTAMP NULL COMMENT '生效时间'
      `);
      console.log('✅ effectiveTime 字段添加成功');
      
      // 3. 添加索引以提高查询性能
      console.log('📝 添加时间字段索引...');
      try {
        await connection.execute(`
          ALTER TABLE menus 
          ADD INDEX idx_publish_time (publishTime)
        `);
        console.log('✅ publishTime 索引添加成功');
      } catch (indexError) {
        if (indexError.code === 'ER_DUP_KEYNAME') {
          console.log('⚠️  publishTime 索引已存在，跳过');
        } else {
          throw indexError;
        }
      }
      
      try {
        await connection.execute(`
          ALTER TABLE menus 
          ADD INDEX idx_effective_time (effectiveTime)
        `);
        console.log('✅ effectiveTime 索引添加成功');
      } catch (indexError) {
        if (indexError.code === 'ER_DUP_KEYNAME') {
          console.log('⚠️  effectiveTime 索引已存在，跳过');
        } else {
          throw indexError;
        }
      }
      
      // 提交事务
      await connection.commit();
      console.log('\n✅ 数据库结构修复成功');
      
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    }
    
    // 4. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const [columns] = await connection.execute(`
      DESCRIBE menus
    `);
    
    const timeFields = columns.filter(col => 
      col.Field.includes('Time') || col.Field.includes('time')
    );
    
    console.log('⏰ 时间相关字段:');
    timeFields.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(可为NULL)' : '(NOT NULL)'}`);
    });
    
    // 检查新添加的字段
    const hasPublishTime = columns.some(col => col.Field === 'publishTime');
    const hasEffectiveTime = columns.some(col => col.Field === 'effectiveTime');
    
    console.log('\n🔍 字段验证:');
    console.log(`  - publishTime: ${hasPublishTime ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`  - effectiveTime: ${hasEffectiveTime ? '✅ 存在' : '❌ 缺失'}`);
    
    if (hasPublishTime && hasEffectiveTime) {
      console.log('\n🎉 所有时间字段添加成功！');
    } else {
      console.log('\n❌ 部分字段添加失败');
    }
    
    // 5. 测试插入和更新操作
    console.log('\n🧪 测试时间字段操作...');
    const testMenuId = require('uuid').v4();
    const now = new Date();
    
    // 测试插入
    await connection.execute(`
      INSERT INTO menus (
        _id, publishDate, mealType, publishStatus, 
        publishTime, effectiveTime, createTime, updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testMenuId,
      '2024-02-01',
      'lunch',
      'draft',
      now,
      now,
      now,
      now
    ]);
    console.log('✅ 插入测试成功');
    
    // 测试更新
    const updateTime = new Date();
    await connection.execute(`
      UPDATE menus 
      SET publishTime = ?, effectiveTime = ?, updateTime = ?
      WHERE _id = ?
    `, [updateTime, updateTime, updateTime, testMenuId]);
    console.log('✅ 更新测试成功');
    
    // 清理测试数据
    await connection.execute('DELETE FROM menus WHERE _id = ?', [testMenuId]);
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行修复
if (require.main === module) {
  fixMenusTableSchema().catch(console.error);
}

module.exports = { fixMenusTableSchema };
