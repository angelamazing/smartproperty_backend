const fs = require('fs');
const path = require('path');

/**
 * 数据库结构JSON文件使用示例
 * 展示如何读取和使用导出的数据库结构JSON文件
 */

// 读取数据库结构文件
function loadDatabaseSchema() {
  try {
    const schemaPath = path.join(__dirname, '..', 'database-schema.json');
    const schemaData = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaData);
  } catch (error) {
    console.error('读取数据库结构文件失败:', error.message);
    return null;
  }
}

// 读取数据库摘要文件
function loadDatabaseSummary() {
  try {
    const summaryPath = path.join(__dirname, '..', 'database-summary.json');
    const summaryData = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(summaryData);
  } catch (error) {
    console.error('读取数据库摘要文件失败:', error.message);
    return null;
  }
}

// 示例1: 获取所有表的基本信息
function getAllTablesInfo() {
  const summary = loadDatabaseSummary();
  if (!summary) return;

  console.log('📋 数据库表信息:');
  console.log('='.repeat(50));
  
  Object.entries(summary.tables).forEach(([tableName, tableInfo]) => {
    console.log(`\n📊 表名: ${tableName}`);
    console.log(`   注释: ${tableInfo.comment}`);
    console.log(`   引擎: ${tableInfo.engine}`);
    console.log(`   字段数: ${tableInfo.fieldCount}`);
    console.log(`   主键: ${tableInfo.primaryKeys.join(', ')}`);
    console.log(`   索引数: ${tableInfo.indexes.length}`);
    console.log(`   外键数: ${tableInfo.foreignKeys.length}`);
  });
}

// 示例2: 查找特定字段的表
function findTablesWithField(fieldName) {
  const schema = loadDatabaseSchema();
  if (!schema) return;

  console.log(`\n🔍 查找包含字段 '${fieldName}' 的表:`);
  console.log('='.repeat(50));

  Object.entries(schema.tables).forEach(([tableName, tableInfo]) => {
    if (tableInfo.fields[fieldName]) {
      const field = tableInfo.fields[fieldName];
      console.log(`\n📊 表: ${tableName}`);
      console.log(`   字段: ${field.name}`);
      console.log(`   类型: ${field.type.original}`);
      console.log(`   可空: ${field.attributes.nullable ? '是' : '否'}`);
      console.log(`   注释: ${field.attributes.comment || '无'}`);
    }
  });
}

// 示例3: 分析表间关系
function analyzeTableRelationships() {
  const summary = loadDatabaseSummary();
  if (!summary) return;

  console.log('\n🔗 表间关系分析:');
  console.log('='.repeat(50));

  // 按表分组关系
  const relationshipsByTable = {};
  summary.relationships.forEach(rel => {
    const fromTable = rel.from.split('.')[0];
    if (!relationshipsByTable[fromTable]) {
      relationshipsByTable[fromTable] = [];
    }
    relationshipsByTable[fromTable].push(rel);
  });

  Object.entries(relationshipsByTable).forEach(([tableName, relations]) => {
    console.log(`\n📊 ${tableName} 表的关系:`);
    relations.forEach(rel => {
      console.log(`   ${rel.from} → ${rel.to} (${rel.updateRule}/${rel.deleteRule})`);
    });
  });
}

// 示例4: 生成字段统计报告
function generateFieldStatistics() {
  const schema = loadDatabaseSchema();
  if (!schema) return;

  console.log('\n📊 字段类型统计:');
  console.log('='.repeat(50));

  const typeStats = {};
  const nullableStats = { nullable: 0, notNull: 0 };

  Object.values(schema.tables).forEach(table => {
    Object.values(table.fields).forEach(field => {
      const type = field.type.type;
      typeStats[type] = (typeStats[type] || 0) + 1;
      
      if (field.attributes.nullable) {
        nullableStats.nullable++;
      } else {
        nullableStats.notNull++;
      }
    });
  });

  console.log('\n按类型统计:');
  Object.entries(typeStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} 个字段`);
    });

  console.log('\n按可空性统计:');
  console.log(`   可空字段: ${nullableStats.nullable} 个`);
  console.log(`   非空字段: ${nullableStats.notNull} 个`);
}

// 示例5: 查找所有外键关系
function findAllForeignKeys() {
  const schema = loadDatabaseSchema();
  if (!schema) return;

  console.log('\n🔗 所有外键关系:');
  console.log('='.repeat(50));

  Object.entries(schema.tables).forEach(([tableName, tableInfo]) => {
    if (tableInfo.foreignKeys.length > 0) {
      console.log(`\n📊 ${tableName} 表的外键:`);
      tableInfo.foreignKeys.forEach(fk => {
        console.log(`   ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
        console.log(`   更新规则: ${fk.updateRule}, 删除规则: ${fk.deleteRule}`);
      });
    }
  });
}

// 示例6: 生成表结构摘要
function generateTableSummary(tableName) {
  const schema = loadDatabaseSchema();
  if (!schema || !schema.tables[tableName]) {
    console.log(`表 ${tableName} 不存在`);
    return;
  }

  const table = schema.tables[tableName];
  console.log(`\n📊 表 ${tableName} 的详细结构:`);
  console.log('='.repeat(50));
  console.log(`注释: ${table.comment}`);
  console.log(`引擎: ${table.engine}`);
  console.log(`字符集: ${table.collation}`);
  console.log(`行数: ${table.rows}`);
  console.log(`数据大小: ${Math.round(table.dataLength / 1024)} KB`);
  console.log(`索引大小: ${Math.round(table.indexLength / 1024)} KB`);

  console.log('\n字段列表:');
  Object.entries(table.fields).forEach(([fieldName, field]) => {
    const keyInfo = field.attributes.isPrimaryKey ? ' [主键]' : 
                   field.attributes.isUnique ? ' [唯一]' : 
                   field.attributes.isIndex ? ' [索引]' : '';
    const nullable = field.attributes.nullable ? 'NULL' : 'NOT NULL';
    console.log(`   ${fieldName}: ${field.type.original} ${nullable}${keyInfo}`);
  });

  if (table.indexes.length > 0) {
    console.log('\n索引列表:');
    table.indexes.forEach(index => {
      const unique = index.unique ? ' [唯一]' : '';
      console.log(`   ${index.name}: ${index.columns.map(c => c.column).join(', ')}${unique}`);
    });
  }

  if (table.foreignKeys.length > 0) {
    console.log('\n外键列表:');
    table.foreignKeys.forEach(fk => {
      console.log(`   ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
    });
  }
}

// 示例7: 验证数据库设计规范
function validateDatabaseDesign() {
  const schema = loadDatabaseSchema();
  if (!schema) return;

  console.log('\n🔍 数据库设计规范检查:');
  console.log('='.repeat(50));

  const issues = [];

  Object.entries(schema.tables).forEach(([tableName, table]) => {
    // 检查是否有主键
    const hasPrimaryKey = Object.values(table.fields).some(field => field.attributes.isPrimaryKey);
    if (!hasPrimaryKey) {
      issues.push(`表 ${tableName} 缺少主键`);
    }

    // 检查主键是否为UUID格式
    const primaryKeys = Object.values(table.fields).filter(field => field.attributes.isPrimaryKey);
    primaryKeys.forEach(pk => {
      if (pk.type.baseType === 'varchar' && pk.type.length !== 36) {
        issues.push(`表 ${tableName} 的主键 ${pk.name} 长度不是36位UUID格式`);
      }
    });

    // 检查是否有创建时间和更新时间字段
    const hasCreateTime = table.fields.createTime && table.fields.createTime.type.baseType === 'timestamp';
    const hasUpdateTime = table.fields.updateTime && table.fields.updateTime.type.baseType === 'timestamp';
    
    if (!hasCreateTime) {
      issues.push(`表 ${tableName} 缺少 createTime 字段`);
    }
    if (!hasUpdateTime) {
      issues.push(`表 ${tableName} 缺少 updateTime 字段`);
    }
  });

  if (issues.length === 0) {
    console.log('✅ 数据库设计规范检查通过');
  } else {
    console.log('❌ 发现以下问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
}

// 主函数
function main() {
  console.log('🗄️ 数据库结构JSON文件使用示例');
  console.log('='.repeat(50));

  // 运行所有示例
  getAllTablesInfo();
  findTablesWithField('userId');
  analyzeTableRelationships();
  generateFieldStatistics();
  findAllForeignKeys();
  generateTableSummary('users');
  validateDatabaseDesign();

  console.log('\n✅ 所有示例运行完成');
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  loadDatabaseSchema,
  loadDatabaseSummary,
  getAllTablesInfo,
  findTablesWithField,
  analyzeTableRelationships,
  generateFieldStatistics,
  findAllForeignKeys,
  generateTableSummary,
  validateDatabaseDesign
};
