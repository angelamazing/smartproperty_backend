# 用户列表 API 文档

## 1. API 概述

获取用户列表 API 用于管理员查询系统中的用户信息，支持按角色、状态、部门和关键词进行筛选，以及分页查询。

## 2. API 路径

`GET /api/user/list`

## 3. 请求方式

GET

## 4. 权限要求

- 需要有效的用户认证 Token
- 需要部门管理员（dept_admin）及以上权限

## 5. 请求参数

所有参数均为可选的查询参数：

| 参数名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| role | string | 用户角色筛选（可选值：user、dept_admin、sys_admin、verifier） | `dept_admin` |
| status | string | 用户状态筛选（可选值：active、inactive） | `active` |
| department | string | 部门名称模糊匹配 | `技术部` |
| keyword | string | 关键词搜索（匹配用户昵称、手机号） | `张三` |
| page | number | 当前页码，默认值：1 | `2` |
| pageSize | number | 每页显示条数，默认值：20 | `50` |

## 6. 响应格式

### 成功响应

```json
{
  "success": true,
  "message": "获取用户列表成功",
  "code": 200,
  "timestamp": "2023-11-15T10:30:45.123Z",
  "data": {
    "records": [
      {
        "_id": "string", // 用户ID
        "nickName": "string", // 用户昵称
        "avatarUrl": "string", // 头像URL
        "phoneNumber": "string", // 手机号
        "email": "string", // 邮箱
        "department": "string", // 部门
        "role": "string", // 角色
        "status": "string", // 状态
        "createTime": "string", // 创建时间
        "updateTime": "string", // 更新时间
        "lastLoginTime": "string", // 最后登录时间
        "isTestUser": boolean // 是否为测试用户
      }
      // 更多用户记录...
    ],
    "total": 100, // 总记录数
    "page": 1, // 当前页码
    "pageSize": 20, // 每页显示条数
    "hasMore": true // 是否有更多数据
  }
}
```

### 错误响应

```json
{
  "success": false,
  "message": "获取用户列表失败",
  "code": 500,
  "timestamp": "2023-11-15T10:30:45.123Z",
  "data": null
}
```

## 7. 示例代码

### 请求示例

```javascript
const axios = require('axios');

async function getUserList() {
  try {
    const token = 'YOUR_AUTH_TOKEN';
    const response = await axios.get('/api/user/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        role: 'user',
        status: 'active',
        page: 1,
        pageSize: 10
      }
    });
    console.log('用户列表:', response.data);
  } catch (error) {
    console.error('获取用户列表失败:', error);
  }
}
```

## 8. 实现细节

### 核心逻辑

1. **权限验证**：通过中间件 `authenticateToken` 和 `requireDeptAdmin` 验证用户身份和权限
2. **参数处理**：解析并验证请求参数，设置默认值
3. **构建查询条件**：根据筛选参数构建 SQL WHERE 子句
4. **数据查询**：
   - 先查询符合条件的总记录数
   - 然后查询分页数据，包括用户基本信息
5. **结果返回**：返回分页数据、总数和分页信息

### 数据访问层实现

```javascript
// userService.js 中的核心查询逻辑
async getUserList(filters, page, pageSize, db) {
  try {
    const whereConditions = [];
    const whereValues = [];
    
    // 构建筛选条件
    if (filters.role) {
      whereConditions.push('role = ?');
      whereValues.push(filters.role);
    }
    
    if (filters.status) {
      whereConditions.push('status = ?');
      whereValues.push(filters.status);
    }
    
    if (filters.department) {
      whereConditions.push('department LIKE ?');
      whereValues.push(`%${filters.department}%`);
    }
    
    if (filters.keyword) {
      whereConditions.push('(nickName LIKE ? OR phoneNumber LIKE ?)');
      whereValues.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await db.execute(countSql, whereValues);
    const total = countResult[0].total;
    
    // 查询列表
    const offset = (page - 1) * pageSize;
    const listSql = `
      SELECT _id, nickName, avatarUrl, phoneNumber, email, department, role, status, 
             createTime, updateTime, lastLoginTime, isTestUser
      FROM users ${whereClause}
      ORDER BY createTime DESC
      LIMIT ? OFFSET ?
    `;
    
    const [listResult] = await db.execute(listSql, [...whereValues, pageSize, offset]);
    
    return {
      records: listResult,
      total,
      page,
      pageSize,
      hasMore: (page * pageSize) < total
    };
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    throw error;
  }
}
```

## 9. 常见问题与解决方案

1. **权限不足错误**：确保使用具有部门管理员及以上权限的账号访问此API
2. **参数验证失败**：检查请求参数是否符合要求的数据类型和格式
3. **数据库连接问题**：确保数据库服务正常运行，连接配置正确
4. **查询性能问题**：对于大量数据查询，建议使用分页功能并设置合理的pageSize值

## 10. 测试脚本

项目中提供了专门的验证脚本 `verify-user-api.js` 用于测试用户列表API的修复效果。该脚本模拟实际API调用逻辑，直接连接数据库执行查询，验证修复后的SQL查询是否正常工作。