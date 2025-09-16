# 数据库结构JSON导出说明

## 📋 概述

本文档说明如何将智慧物业管理系统的数据库结构导出为JSON格式，以及导出的JSON文件的结构和使用方法。

## 🚀 快速导出

### 导出完整数据库结构
```bash
node scripts/exportDatabaseSchema.js export
```

### 导出数据库摘要
```bash
node scripts/exportDatabaseSchema.js summary
```

## 📁 输出文件

### 1. database-schema.json - 完整数据库结构
包含所有表的详细结构信息，包括：
- 字段定义和类型
- 索引信息
- 外键关系
- 表属性（引擎、字符集等）

### 2. database-summary.json - 数据库摘要
包含简化的表结构信息，便于快速查看：
- 表基本信息
- 主键列表
- 索引摘要
- 外键关系

## 📊 导出统计

根据最新导出结果：
- **表数量**: 26个
- **字段数量**: 336个
- **索引数量**: 189个
- **外键数量**: 31个

## 🔍 JSON文件结构

### 完整结构文件 (database-schema.json)

```json
{
  "database": {
    "name": "smart_property",
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
    "exportTime": "2025-09-14T01:50:22.088Z",
    "exportVersion": "1.0.0"
  },
  "tables": {
    "table_name": {
      "name": "table_name",
      "comment": "表注释",
      "engine": "InnoDB",
      "collation": "utf8mb4_unicode_ci",
      "rows": 0,
      "dataLength": 16384,
      "indexLength": 114688,
      "fields": {
        "field_name": {
          "name": "field_name",
          "type": {
            "type": "string",
            "baseType": "varchar",
            "length": 36,
            "original": "varchar(36)"
          },
          "attributes": {
            "nullable": false,
            "key": "PRI",
            "isPrimaryKey": true,
            "comment": "字段注释"
          }
        }
      },
      "indexes": [
        {
          "name": "PRIMARY",
          "unique": true,
          "columns": ["_id"]
        }
      ],
      "foreignKeys": [
        {
          "name": "fk_name",
          "column": "user_id",
          "referencedTable": "users",
          "referencedColumn": "_id",
          "updateRule": "CASCADE",
          "deleteRule": "SET NULL"
        }
      ]
    }
  },
  "statistics": {
    "totalTables": 26,
    "totalFields": 336,
    "totalIndexes": 189,
    "totalForeignKeys": 31
  }
}
```

### 摘要文件 (database-summary.json)

```json
{
  "database": {
    "name": "smart_property",
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
    "exportTime": "2025-09-14T01:50:22.088Z",
    "exportVersion": "1.0.0"
  },
  "tables": {
    "table_name": {
      "comment": "表注释",
      "engine": "InnoDB",
      "fieldCount": 14,
      "primaryKeys": ["_id"],
      "indexes": [
        {
          "name": "idx_name",
          "unique": false,
          "columns": ["field1", "field2"]
        }
      ],
      "foreignKeys": [
        {
          "column": "user_id",
          "references": "users._id"
        }
      ]
    }
  },
  "relationships": [
    {
      "from": "table1.field1",
      "to": "table2.field2",
      "updateRule": "CASCADE",
      "deleteRule": "SET NULL"
    }
  ]
}
```

## 🛠️ 字段类型映射

| MySQL类型 | JSON类型 | 说明 |
|-----------|----------|------|
| varchar(n) | string | 变长字符串 |
| char(n) | string | 定长字符串 |
| text | string | 长文本 |
| int | number | 整数 |
| bigint | number | 长整数 |
| decimal(p,s) | number | 精确小数 |
| float | number | 浮点数 |
| double | number | 双精度浮点数 |
| boolean | boolean | 布尔值 |
| date | date | 日期 |
| datetime | datetime | 日期时间 |
| timestamp | timestamp | 时间戳 |
| json | object | JSON对象 |
| enum | enum | 枚举值 |

## 📋 字段属性说明

### 基本属性
- `nullable`: 是否允许NULL值
- `key`: 键类型 (PRI=主键, UNI=唯一键, MUL=普通索引)
- `default`: 默认值
- `extra`: 额外属性 (auto_increment等)
- `comment`: 字段注释

### 类型属性
- `type`: 映射后的类型
- `baseType`: MySQL原始类型
- `length`: 长度限制
- `precision`: 精度 (decimal类型)
- `scale`: 小数位数 (decimal类型)
- `unsigned`: 是否无符号
- `original`: 原始类型定义

## 🔗 外键关系说明

### 外键属性
- `name`: 外键约束名称
- `column`: 当前表字段
- `referencedTable`: 引用表名
- `referencedColumn`: 引用字段名
- `updateRule`: 更新规则 (CASCADE, SET NULL, RESTRICT, NO ACTION)
- `deleteRule`: 删除规则 (CASCADE, SET NULL, RESTRICT, NO ACTION)

## 📊 索引信息说明

### 索引属性
- `name`: 索引名称
- `unique`: 是否唯一索引
- `type`: 索引类型 (BTREE, HASH等)
- `columns`: 索引包含的字段列表

### 字段在索引中的属性
- `column`: 字段名
- `seq`: 在索引中的位置
- `subPart`: 子部分长度
- `null`: 是否允许NULL
- `collation`: 排序规则

## 🎯 使用场景

### 1. 数据库文档生成
- 自动生成API文档
- 生成数据字典
- 创建数据库设计文档

### 2. 代码生成
- 自动生成模型类
- 生成DTO对象
- 创建数据库迁移脚本

### 3. 数据迁移
- 跨数据库迁移
- 数据结构对比
- 版本升级检查

### 4. 开发工具集成
- IDE插件开发
- 数据库管理工具
- 代码生成器

## 🔧 脚本功能

### 主要功能
1. **连接数据库**: 自动连接MySQL数据库
2. **获取表列表**: 查询所有表名
3. **解析表结构**: 详细解析每个表的结构
4. **处理字段类型**: 智能映射MySQL类型到JSON类型
5. **提取索引信息**: 获取所有索引和键信息
6. **分析外键关系**: 解析表间关系
7. **生成统计信息**: 计算数据库统计指标

### 错误处理
- 数据库连接失败处理
- 表结构解析错误处理
- 外键查询兼容性处理
- 文件写入错误处理

## 📝 注意事项

1. **权限要求**: 需要数据库的SELECT权限
2. **字符集**: 确保数据库使用UTF-8字符集
3. **版本兼容**: 支持MySQL 5.7+版本
4. **文件大小**: 完整结构文件可能较大，建议使用摘要文件进行快速查看
5. **更新频率**: 建议在数据库结构变更后重新导出

## 🚀 扩展功能

### 可以扩展的功能
1. **数据导出**: 同时导出表结构和数据
2. **格式转换**: 支持导出为其他格式 (YAML, XML等)
3. **差异对比**: 比较不同版本的结构差异
4. **可视化**: 生成ER图或关系图
5. **验证检查**: 检查数据库设计规范

## 📞 技术支持

如有问题或建议，请参考：
- 数据库初始化脚本: `scripts/initDatabaseComplete.js`
- 数据库结构说明: `数据库结构说明.md`
- 项目文档: `README.md`

---

**最后更新**: 2025年9月14日  
**维护状态**: 持续更新中
