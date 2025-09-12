const mysql = require('mysql2/promise');
const config = require('./config/database');

/**
 * 数据库结构全面验证脚本
 * 检查表结构、字段类型、索引、外键关系等
 */
async function validateDatabaseStructure() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    console.log('🔗 数据库连接成功\n');
    
    // 1. 检查所有表是否存在
    console.log('📋 第一步：检查表存在性');
    await checkTableExistence(connection);
    
    // 2. 检查表结构完整性
    console.log('\n🔍 第二步：检查表结构完整性');
    await checkTableStructures(connection);
    
    // 3. 检查外键关系
    console.log('\n🔗 第三步：检查外键关系');
    await checkForeignKeys(connection);
    
    // 4. 检查索引设置
    console.log('\n📊 第四步：检查索引设置');
    await checkIndexes(connection);
    
    // 5. 检查数据完整性
    console.log('\n✅ 第五步：检查数据完整性');
    await checkDataIntegrity(connection);
    
    // 6. 检查业务逻辑一致性
    console.log('\n🎯 第六步：检查业务逻辑一致性');
    await checkBusinessLogic(connection);
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 检查表存在性
 */
async function checkTableExistence(connection) {
  const expectedTables = [
    'departments', 'users', 'user_tokens', 'verification_codes',
    'roles', 'permissions', 'role_permissions',
    'dish_categories', 'dishes', 'menus', 'menu_dishes',
    'dining_orders', 'special_reservations',
    'venues', 'reservations', 'dining_verifications',
    'system_announcements', 'activity_logs', 'file_uploads'
  ];
  
  const [tables] = await connection.execute('SHOW TABLES');
  const existingTables = tables.map(row => Object.values(row)[0]);
  
  console.log('预期表数量:', expectedTables.length);
  console.log('实际表数量:', existingTables.length);
  
  for (const expectedTable of expectedTables) {
    if (existingTables.includes(expectedTable)) {
      console.log(`✅ ${expectedTable}`);
    } else {
      console.log(`❌ ${expectedTable} - 缺失`);
    }
  }
  
  // 检查是否有额外的表
  const extraTables = existingTables.filter(table => !expectedTables.includes(table));
  if (extraTables.length > 0) {
    console.log('\n⚠️  额外发现的表:');
    extraTables.forEach(table => console.log(`   + ${table}`));
  }
}

/**
 * 检查表结构完整性
 */
async function checkTableStructures(connection) {
  const criticalTables = ['users', 'departments', 'dishes', 'menus', 'dining_orders'];
  
  for (const tableName of criticalTables) {
    try {
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.log(`\n📋 ${tableName} 表结构:`);
      
      // 检查必要字段
      const requiredFields = getRequiredFields(tableName);
      const existingFields = columns.map(col => col.Field);
      
      for (const requiredField of requiredFields) {
        if (existingFields.includes(requiredField.name)) {
          const col = columns.find(c => c.Field === requiredField.name);
          console.log(`  ✅ ${requiredField.name}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
          
          // 检查字段类型
          if (requiredField.expectedType && !col.Type.includes(requiredField.expectedType)) {
            console.log(`    ⚠️  类型不匹配: 期望 ${requiredField.expectedType}, 实际 ${col.Type}`);
          }
        } else {
          console.log(`  ❌ ${requiredField.name} - 缺失`);
        }
      }
      
      // 检查字段数量
      console.log(`  字段总数: ${columns.length}`);
      
    } catch (error) {
      console.log(`❌ 无法检查 ${tableName} 表: ${error.message}`);
    }
  }
}

/**
 * 获取必要字段定义
 */
function getRequiredFields(tableName) {
  const fieldDefinitions = {
    users: [
      { name: '_id', expectedType: 'varchar' },
      { name: 'phoneNumber', expectedType: 'varchar' },
      { name: 'role', expectedType: 'enum' },
      { name: 'status', expectedType: 'enum' },
      { name: 'createTime', expectedType: 'timestamp' }
    ],
    departments: [
      { name: '_id', expectedType: 'varchar' },
      { name: 'name', expectedType: 'varchar' },
      { name: 'code', expectedType: 'varchar' },
      { name: 'status', expectedType: 'enum' }
    ],
    dishes: [
      { name: '_id', expectedType: 'varchar' },
      { name: 'name', expectedType: 'varchar' },
      { name: 'price', expectedType: 'decimal' },
      { name: 'status', expectedType: 'enum' }
    ],
    menus: [
      { name: '_id', expectedType: 'varchar' },
      { name: 'publishDate', expectedType: 'date' },
      { name: 'mealType', expectedType: 'enum' },
      { name: 'publishStatus', expectedType: 'enum' }
    ],
    dining_orders: [
      { name: '_id', expectedType: 'varchar' },
      { name: 'registrantId', expectedType: 'varchar' },
      { name: 'diningDate', expectedType: 'date' },
      { name: 'mealType', expectedType: 'enum' },
      { name: 'status', expectedType: 'enum' }
    ]
  };
  
  return fieldDefinitions[tableName] || [];
}

/**
 * 检查外键关系
 */
async function checkForeignKeys(connection) {
  try {
    const [foreignKeys] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = 'smart_property' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log(`发现 ${foreignKeys.length} 个外键关系:`);
    
    for (const fk of foreignKeys) {
      console.log(`  🔗 ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    }
    
    // 检查关键外键
    const criticalFKs = [
      { table: 'users', column: 'departmentId', refTable: 'departments', refColumn: '_id' },
      { table: 'dishes', column: 'categoryId', refTable: 'dish_categories', refColumn: '_id' },
      { table: 'menu_dishes', column: 'menuId', refTable: 'menus', refColumn: '_id' },
      { table: 'menu_dishes', column: 'dishId', refTable: 'dishes', refColumn: '_id' },
      { table: 'dining_orders', column: 'registrantId', refTable: 'users', refColumn: '_id' }
    ];
    
    console.log('\n检查关键外键关系:');
    for (const criticalFK of criticalFKs) {
      const exists = foreignKeys.some(fk => 
        fk.TABLE_NAME === criticalFK.table && 
        fk.COLUMN_NAME === criticalFK.column &&
        fk.REFERENCED_TABLE_NAME === criticalFK.refTable
      );
      
      if (exists) {
        console.log(`  ✅ ${criticalFK.table}.${criticalFK.column} -> ${criticalFK.refTable}.${criticalFK.refColumn}`);
      } else {
        console.log(`  ❌ ${criticalFK.table}.${criticalFK.column} -> ${criticalFK.refTable}.${criticalFK.refColumn} - 缺失`);
      }
    }
    
  } catch (error) {
    console.log(`❌ 检查外键失败: ${error.message}`);
  }
}

/**
 * 检查索引设置
 */
async function checkIndexes(connection) {
  try {
    const [indexes] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'smart_property'
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log(`发现 ${indexes.length} 个索引:`);
    
    // 按表分组显示索引
    const tableIndexes = {};
    indexes.forEach(idx => {
      if (!tableIndexes[idx.TABLE_NAME]) {
        tableIndexes[idx.TABLE_NAME] = [];
      }
      tableIndexes[idx.TABLE_NAME].push(idx);
    });
    
    for (const [tableName, tableIdx] of Object.entries(tableIndexes)) {
      console.log(`\n📊 ${tableName}:`);
      
      // 按索引名分组
      const indexGroups = {};
      tableIdx.forEach(idx => {
        if (!indexGroups[idx.INDEX_NAME]) {
          indexGroups[idx.INDEX_NAME] = [];
        }
        indexGroups[idx.INDEX_NAME].push(idx);
      });
      
      for (const [indexName, columns] of Object.entries(indexGroups)) {
        const isUnique = columns[0].NON_UNIQUE === 0;
        const columnList = columns.map(c => c.COLUMN_NAME).join(', ');
        console.log(`  ${isUnique ? '🔒' : '📈'} ${indexName}: ${columnList}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ 检查索引失败: ${error.message}`);
  }
}

/**
 * 检查数据完整性
 */
async function checkDataIntegrity(connection) {
  try {
    // 检查各表的记录数
    const tables = ['users', 'departments', 'dishes', 'menus', 'dining_orders', 'reservations'];
    
    console.log('各表记录数统计:');
    for (const table of tables) {
      try {
        const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  📊 ${table}: ${result[0].count} 条记录`);
      } catch (error) {
        console.log(`  ❌ ${table}: 无法访问 - ${error.message}`);
      }
    }
    
    // 检查数据一致性
    console.log('\n检查数据一致性:');
    
    // 检查用户部门关联
    try {
      const [orphanUsers] = await connection.execute(`
        SELECT COUNT(*) as count FROM users u 
        LEFT JOIN departments d ON u.departmentId = d._id 
        WHERE u.departmentId IS NOT NULL AND d._id IS NULL
      `);
      
      if (orphanUsers[0].count > 0) {
        console.log(`  ⚠️  发现 ${orphanUsers[0].count} 个用户的部门ID无效`);
      } else {
        console.log(`  ✅ 用户部门关联正常`);
      }
    } catch (error) {
      console.log(`  ❌ 检查用户部门关联失败: ${error.message}`);
    }
    
    // 检查菜单菜品关联
    try {
      const [orphanMenuDishes] = await connection.execute(`
        SELECT COUNT(*) as count FROM menu_dishes md 
        LEFT JOIN menus m ON md.menuId = m._id 
        WHERE m._id IS NULL
      `);
      
      if (orphanMenuDishes[0].count > 0) {
        console.log(`  ⚠️  发现 ${orphanMenuDishes[0].count} 个菜单菜品关联的菜单ID无效`);
      } else {
        console.log(`  ✅ 菜单菜品关联正常`);
      }
    } catch (error) {
      console.log(`  ❌ 检查菜单菜品关联失败: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ 检查数据完整性失败: ${error.message}`);
  }
}

/**
 * 检查业务逻辑一致性
 */
async function checkBusinessLogic(connection) {
  try {
    console.log('检查业务逻辑一致性:');
    
    // 检查用户角色分布
    try {
      const [roleStats] = await connection.execute(`
        SELECT role, COUNT(*) as count FROM users GROUP BY role
      `);
      
      console.log('  用户角色分布:');
      roleStats.forEach(stat => {
        console.log(`    ${stat.role}: ${stat.count} 人`);
      });
    } catch (error) {
      console.log(`  ❌ 检查用户角色分布失败: ${error.message}`);
    }
    
    // 检查菜单状态分布
    try {
      const [menuStats] = await connection.execute(`
        SELECT publishStatus, COUNT(*) as count FROM menus GROUP BY publishStatus
      `);
      
      console.log('  菜单状态分布:');
      menuStats.forEach(stat => {
        console.log(`    ${stat.publishStatus}: ${stat.count} 个`);
      });
    } catch (error) {
      console.log(`  ❌ 检查菜单状态分布失败: ${error.message}`);
    }
    
    // 检查报餐订单状态分布
    try {
      const [orderStats] = await connection.execute(`
        SELECT status, COUNT(*) as count FROM dining_orders GROUP BY status
      `);
      
      console.log('  报餐订单状态分布:');
      orderStats.forEach(stat => {
        console.log(`    ${stat.status}: ${stat.count} 个`);
      });
    } catch (error) {
      console.log(`  ❌ 检查报餐订单状态分布失败: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ 检查业务逻辑一致性失败: ${error.message}`);
  }
}

// 运行验证
console.log('🚀 开始数据库结构全面验证...\n');
validateDatabaseStructure();
