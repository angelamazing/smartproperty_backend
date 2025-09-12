const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../config/database');

async function createDiningConfirmationTables() {
  let connection;
  try {
    console.log('开始创建就餐确认相关表...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config.database);
    console.log('数据库连接成功');

    // 读取SQL文件
    const sqlPath = path.join(__dirname, '../sql/add_user_id_field.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // 分割SQL语句（按分号分割）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    console.log(`找到 ${sqlStatements.length} 条SQL语句`);

    // 执行每个SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      if (statement.trim()) {
        try {
          console.log(`执行第 ${i + 1} 条SQL语句...`);
          await connection.execute(statement);
          console.log(`第 ${i + 1} 条SQL语句执行成功`);
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('Duplicate column') ||
              error.message.includes('Duplicate key name') ||
              error.message.includes('Duplicate entry')) {
            console.log(`第 ${i + 1} 条SQL语句跳过（已存在）: ${error.message}`);
          } else {
            console.error(`第 ${i + 1} 条SQL语句执行失败:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('所有SQL语句执行完成');

    // 验证表是否创建成功
    console.log('验证表创建结果...');
    
    // 检查dining_confirmation_logs表
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'dining_confirmation_logs'"
    );
    
    if (tables.length > 0) {
      console.log('✅ dining_confirmation_logs表创建成功');
      
      // 显示表结构
      const [columns] = await connection.execute(
        'DESCRIBE dining_confirmation_logs'
      );
      console.log('表结构:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
    } else {
      console.log('❌ dining_confirmation_logs表创建失败');
    }

    // 检查dining_orders表的字段
    const [orderColumns] = await connection.execute(
      'DESCRIBE dining_orders'
    );
    
    const hasActualDiningTime = orderColumns.some(col => col.Field === 'actualDiningTime');
    const hasDiningStatus = orderColumns.some(col => col.Field === 'diningStatus');
    const hasUserId = orderColumns.some(col => col.Field === 'userId');
    const hasUserName = orderColumns.some(col => col.Field === 'userName');

    console.log('dining_orders表字段检查:');
    console.log(`  actualDiningTime: ${hasActualDiningTime ? '✅' : '❌'}`);
    console.log(`  diningStatus: ${hasDiningStatus ? '✅' : '❌'}`);
    console.log(`  userId: ${hasUserId ? '✅' : '❌'}`);
    console.log(`  userName: ${hasUserName ? '✅' : '❌'}`);

    console.log('✅ 数据库表创建和更新完成！');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行脚本
if (require.main === module) {
  createDiningConfirmationTables()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = createDiningConfirmationTables;
