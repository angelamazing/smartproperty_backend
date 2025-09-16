const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkDishesTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection(config.database);
    console.log('🔗 数据库连接成功');

    // 检查dishes表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'smart_property' 
      AND TABLE_NAME = 'dishes'
    `);

    if (tables.length === 0) {
      console.log('❌ dishes表不存在');
      return;
    }

    console.log('✅ dishes表存在');

    // 查看表结构
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'smart_property' 
      AND TABLE_NAME = 'dishes'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 dishes表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''} ${col.COLUMN_COMMENT ? `// ${col.COLUMN_COMMENT}` : ''}`);
    });

    // 查看表数据
    const [rows] = await connection.execute('SELECT * FROM dishes LIMIT 3');
    console.log('\n📊 示例数据:');
    console.log(JSON.stringify(rows, null, 2));

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDishesTable();
