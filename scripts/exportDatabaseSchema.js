const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../config/database');

/**
 * 数据库结构导出工具
 * 将数据库表结构导出为JSON格式
 */

/**
 * 解析字段类型和属性
 */
function parseFieldType(fieldType) {
  const type = fieldType.toLowerCase();
  
  // 基本类型映射
  const typeMap = {
    'varchar': 'string',
    'char': 'string',
    'text': 'string',
    'longtext': 'string',
    'mediumtext': 'string',
    'tinytext': 'string',
    'int': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'tinyint': 'number',
    'mediumint': 'number',
    'decimal': 'number',
    'float': 'number',
    'double': 'number',
    'boolean': 'boolean',
    'bool': 'boolean',
    'date': 'date',
    'datetime': 'datetime',
    'timestamp': 'timestamp',
    'time': 'time',
    'year': 'number',
    'json': 'object',
    'enum': 'enum',
    'set': 'set'
  };

  // 提取长度信息
  let length = null;
  let precision = null;
  let scale = null;

  if (type.includes('(') && type.includes(')')) {
    const match = type.match(/(\w+)\(([^)]+)\)/);
    if (match) {
      const baseType = match[1];
      const params = match[2];
      
      if (baseType === 'decimal' || baseType === 'numeric') {
        const parts = params.split(',');
        precision = parseInt(parts[0]);
        scale = parts[1] ? parseInt(parts[1]) : 0;
      } else if (baseType === 'float' || baseType === 'double') {
        const parts = params.split(',');
        precision = parseInt(parts[0]);
        scale = parts[1] ? parseInt(parts[1]) : null;
      } else {
        length = parseInt(params);
      }
    }
  }

  // 提取基础类型
  const baseType = type.replace(/\([^)]*\)/, '').replace(/unsigned/i, '').trim();
  const mappedType = typeMap[baseType] || 'string';

  return {
    type: mappedType,
    baseType: baseType,
    length: length,
    precision: precision,
    scale: scale,
    unsigned: type.includes('unsigned'),
    original: fieldType
  };
}

/**
 * 解析字段属性
 */
function parseFieldAttributes(field) {
  const attributes = {
    nullable: field.Null === 'YES',
    key: field.Key,
    default: field.Default,
    extra: field.Extra,
    comment: field.Comment || '',
    collation: field.Collation,
    privileges: field.Privileges
  };

  // 解析键类型
  if (field.Key === 'PRI') {
    attributes.isPrimaryKey = true;
  } else if (field.Key === 'UNI') {
    attributes.isUnique = true;
  } else if (field.Key === 'MUL') {
    attributes.isIndex = true;
  }

  // 解析额外属性
  if (field.Extra.includes('auto_increment')) {
    attributes.autoIncrement = true;
  }
  if (field.Extra.includes('on update')) {
    attributes.onUpdate = field.Extra.match(/on update (.+)/i)?.[1];
  }

  return attributes;
}

/**
 * 获取表结构信息
 */
async function getTableSchema(connection, tableName) {
  try {
    // 获取字段信息
    const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
    
    // 获取表信息
    const [tableInfo] = await connection.query(`
      SELECT 
        TABLE_NAME,
        TABLE_COMMENT,
        ENGINE,
        TABLE_COLLATION,
        TABLE_ROWS,
        AVG_ROW_LENGTH,
        DATA_LENGTH,
        MAX_DATA_LENGTH,
        INDEX_LENGTH,
        DATA_FREE,
        AUTO_INCREMENT,
        CREATE_TIME,
        UPDATE_TIME,
        CHECK_TIME,
        TABLE_TYPE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ?
    `, [tableName]);

    // 获取索引信息
    const [indexes] = await connection.query(`SHOW INDEX FROM \`${tableName}\``);
    
    // 获取外键信息
    const [foreignKeys] = await connection.query(`
      SELECT 
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
      FROM information_schema.KEY_COLUMN_USAGE kcu
      LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = DATABASE() 
      AND kcu.TABLE_NAME = ? 
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName]);

    // 处理字段信息
    const fields = {};
    columns.forEach(column => {
      const fieldType = parseFieldType(column.Type);
      const attributes = parseFieldAttributes(column);
      
      fields[column.Field] = {
        name: column.Field,
        type: fieldType,
        attributes: attributes,
        position: column.Position
      };
    });

    // 处理索引信息
    const indexMap = {};
    indexes.forEach(index => {
      const indexName = index.Key_name;
      if (!indexMap[indexName]) {
        indexMap[indexName] = {
          name: indexName,
          unique: !index.Non_unique,
          type: index.Index_type,
          columns: [],
          comment: index.Comment || ''
        };
      }
      indexMap[indexName].columns.push({
        column: index.Column_name,
        seq: index.Seq_in_index,
        subPart: index.Sub_part,
        packed: index.Packed,
        null: index.Null,
        collation: index.Collation
      });
    });

    // 处理外键信息
    const foreignKeyMap = {};
    foreignKeys.forEach(fk => {
      const constraintName = fk.CONSTRAINT_NAME;
      if (!foreignKeyMap[constraintName]) {
        foreignKeyMap[constraintName] = {
          name: constraintName,
          column: fk.COLUMN_NAME,
          referencedTable: fk.REFERENCED_TABLE_NAME,
          referencedColumn: fk.REFERENCED_COLUMN_NAME,
          updateRule: fk.UPDATE_RULE,
          deleteRule: fk.DELETE_RULE
        };
      }
    });

    return {
      name: tableName,
      comment: tableInfo[0]?.TABLE_COMMENT || '',
      engine: tableInfo[0]?.ENGINE || '',
      collation: tableInfo[0]?.TABLE_COLLATION || '',
      rows: tableInfo[0]?.TABLE_ROWS || 0,
      avgRowLength: tableInfo[0]?.AVG_ROW_LENGTH || 0,
      dataLength: tableInfo[0]?.DATA_LENGTH || 0,
      maxDataLength: tableInfo[0]?.MAX_DATA_LENGTH || 0,
      indexLength: tableInfo[0]?.INDEX_LENGTH || 0,
      dataFree: tableInfo[0]?.DATA_FREE || 0,
      autoIncrement: tableInfo[0]?.AUTO_INCREMENT || null,
      createTime: tableInfo[0]?.CREATE_TIME || null,
      updateTime: tableInfo[0]?.UPDATE_TIME || null,
      checkTime: tableInfo[0]?.CHECK_TIME || null,
      tableType: tableInfo[0]?.TABLE_TYPE || '',
      fields: fields,
      indexes: Object.values(indexMap),
      foreignKeys: Object.values(foreignKeyMap)
    };
  } catch (error) {
    console.error(`获取表 ${tableName} 结构失败:`, error.message);
    throw error;
  }
}

/**
 * 获取所有表名
 */
async function getAllTables(connection) {
  try {
    const [tables] = await connection.query('SHOW TABLES');
    return tables.map(row => Object.values(row)[0]);
  } catch (error) {
    console.error('获取表列表失败:', error.message);
    throw error;
  }
}

/**
 * 导出数据库结构
 */
async function exportDatabaseSchema() {
  let connection;
  
  try {
    console.log('开始导出数据库结构...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('数据库连接成功');

    // 获取数据库信息
    const [dbInfo] = await connection.query(`
      SELECT 
        SCHEMA_NAME,
        DEFAULT_CHARACTER_SET_NAME,
        DEFAULT_COLLATION_NAME
      FROM information_schema.SCHEMATA 
      WHERE SCHEMA_NAME = DATABASE()
    `);

    // 获取所有表
    const tableNames = await getAllTables(connection);
    console.log(`发现 ${tableNames.length} 个表`);

    // 获取每个表的结构
    const tables = {};
    for (const tableName of tableNames) {
      console.log(`正在处理表: ${tableName}`);
      tables[tableName] = await getTableSchema(connection, tableName);
    }

    // 构建完整的数据库结构
    const databaseSchema = {
      database: {
        name: dbInfo[0]?.SCHEMA_NAME || config.database.database,
        charset: dbInfo[0]?.DEFAULT_CHARACTER_SET_NAME || 'utf8mb4',
        collation: dbInfo[0]?.DEFAULT_COLLATION_NAME || 'utf8mb4_unicode_ci',
        exportTime: new Date().toISOString(),
        exportVersion: '1.0.0'
      },
      tables: tables,
      statistics: {
        totalTables: tableNames.length,
        totalFields: Object.values(tables).reduce((sum, table) => sum + Object.keys(table.fields).length, 0),
        totalIndexes: Object.values(tables).reduce((sum, table) => sum + table.indexes.length, 0),
        totalForeignKeys: Object.values(tables).reduce((sum, table) => sum + table.foreignKeys.length, 0)
      }
    };

    // 保存到文件
    const outputPath = path.join(__dirname, '..', 'database-schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(databaseSchema, null, 2), 'utf8');
    
    console.log(`✅ 数据库结构导出完成！`);
    console.log(`📁 文件位置: ${outputPath}`);
    console.log(`📊 统计信息:`);
    console.log(`   - 表数量: ${databaseSchema.statistics.totalTables}`);
    console.log(`   - 字段数量: ${databaseSchema.statistics.totalFields}`);
    console.log(`   - 索引数量: ${databaseSchema.statistics.totalIndexes}`);
    console.log(`   - 外键数量: ${databaseSchema.statistics.totalForeignKeys}`);

    return databaseSchema;
  } catch (error) {
    console.error('导出数据库结构失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

/**
 * 生成简化的表结构摘要
 */
function generateTableSummary(schema) {
  const summary = {
    database: schema.database,
    tables: {},
    relationships: []
  };

  // 生成表摘要
  Object.values(schema.tables).forEach(table => {
    summary.tables[table.name] = {
      comment: table.comment,
      engine: table.engine,
      fieldCount: Object.keys(table.fields).length,
      primaryKeys: Object.values(table.fields).filter(field => field.attributes.isPrimaryKey).map(field => field.name),
      indexes: table.indexes.map(idx => ({
        name: idx.name,
        unique: idx.unique,
        columns: idx.columns.map(col => col.column)
      })),
      foreignKeys: table.foreignKeys.map(fk => ({
        column: fk.column,
        references: `${fk.referencedTable}.${fk.referencedColumn}`
      }))
    };
  });

  // 生成关系图
  Object.values(schema.tables).forEach(table => {
    table.foreignKeys.forEach(fk => {
      summary.relationships.push({
        from: `${table.name}.${fk.column}`,
        to: `${fk.referencedTable}.${fk.referencedColumn}`,
        updateRule: fk.updateRule,
        deleteRule: fk.deleteRule
      });
    });
  });

  return summary;
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'export':
        await exportDatabaseSchema();
        break;
        
      case 'summary':
        const schema = await exportDatabaseSchema();
        const summary = generateTableSummary(schema);
        const summaryPath = path.join(__dirname, '..', 'database-summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`📋 数据库摘要已保存到: ${summaryPath}`);
        break;
        
      default:
        console.log('数据库结构导出工具');
        console.log('');
        console.log('使用方法:');
        console.log('  node scripts/exportDatabaseSchema.js export  - 导出完整数据库结构');
        console.log('  node scripts/exportDatabaseSchema.js summary - 导出数据库摘要');
        console.log('');
        console.log('输出文件:');
        console.log('  - database-schema.json    - 完整数据库结构');
        console.log('  - database-summary.json   - 数据库摘要');
        break;
    }
  } catch (error) {
    console.error('操作失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  exportDatabaseSchema,
  generateTableSummary,
  parseFieldType,
  parseFieldAttributes
};
