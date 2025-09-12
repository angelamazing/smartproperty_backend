const mysql = require('mysql2/promise');
const config = require('../config/database');

async function addUserIdField() {
  let connection;
  try {
    console.log('开始为dining_orders表添加userId字段...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config.database);
    console.log('数据库连接成功');

    // 检查userId字段是否已存在
    const [columns] = await connection.execute('DESCRIBE dining_orders');
    const hasUserId = columns.some(col => col.Field === 'userId');
    
    if (hasUserId) {
      console.log('userId字段已存在，跳过添加');
    } else {
      // 添加userId字段
      await connection.execute(
        'ALTER TABLE dining_orders ADD COLUMN userId VARCHAR(36) COMMENT \'用户ID\''
      );
      console.log('userId字段添加成功');
    }

    // 检查userName字段是否已存在
    const hasUserName = columns.some(col => col.Field === 'userName');
    
    if (hasUserName) {
      console.log('userName字段已存在');
    } else {
      console.log('userName字段不存在');
    }

    // 最终检查
    const [finalColumns] = await connection.execute('DESCRIBE dining_orders');
    const finalHasUserId = finalColumns.some(col => col.Field === 'userId');
    const finalHasUserName = finalColumns.some(col => col.Field === 'userName');
    
    console.log('最终检查结果:');
    console.log(`  userId: ${finalHasUserId ? '✅' : '❌'}`);
    console.log(`  userName: ${finalHasUserName ? '✅' : '❌'}`);

    console.log('✅ 字段添加完成！');

  } catch (error) {
    console.error('❌ 添加字段失败:', error);
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
  addUserIdField()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addUserIdField;
