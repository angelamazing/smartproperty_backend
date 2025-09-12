# 用户角色管理API文档

## 概述
本文档描述了系统中用户角色管理的相关API接口，包括角色查询、用户角色更新等功能。

## 系统支持的角色

### 1. user（普通用户）
- **角色ID**: `user`
- **角色名称**: 普通用户
- **权限级别**: 基础权限
- **描述**: 系统的基础用户角色，拥有基本的查看和操作权限

### 2. admin（管理员）
- **角色ID**: `admin`
- **角色名称**: 管理员
- **权限级别**: 管理权限
- **描述**: 系统管理员角色，拥有用户管理、内容管理等权限

### 3. dept_admin（部门管理员）
- **角色ID**: `dept_admin`
- **角色名称**: 部门管理员
- **权限级别**: 部门级管理权限
- **描述**: 部门级别的管理员，可以管理本部门内的用户和资源

### 4. sys_admin（系统管理员）
- **角色ID**: `sys_admin`
- **角色名称**: 系统管理员
- **权限级别**: 系统级管理权限
- **描述**: 系统最高权限角色，拥有所有系统管理权限

## API接口

### 1. 获取所有角色列表

**接口地址**: `GET /api/admin/roles`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "role_001",
      "name": "user",
      "description": "普通用户",
      "status": "active",
      "user_count": 150,
      "permissions": [],
      "permissionCount": 0
    },
    {
      "id": "role_002", 
      "name": "admin",
      "description": "管理员",
      "status": "active",
      "user_count": 5,
      "permissions": [],
      "permissionCount": 0
    },
    {
      "id": "role_003",
      "name": "sys_admin", 
      "description": "系统管理员",
      "status": "active",
      "user_count": 2,
      "permissions": [],
      "permissionCount": 0
    },
    {
      "id": "role_004",
      "name": "dept_admin",
      "description": "部门管理员", 
      "status": "active",
      "user_count": 8,
      "permissions": [],
      "permissionCount": 0
    }
  ],
  "message": "获取角色列表成功"
}
```

### 2. 更新用户角色

**接口地址**: `PUT /api/users/{userId}/role`

**权限要求**: 需要系统管理员权限（sys_admin）

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数**:
- `userId` (string): 用户ID

**请求体**:
```json
{
  "role": "admin"
}
```

**请求体参数说明**:
| 参数名 | 类型 | 必填 | 说明 | 可选值 |
|--------|------|------|------|--------|
| role | string | 是 | 用户角色 | `user`, `admin`, `dept_admin`, `sys_admin` |

**成功响应**:
```json
{
  "success": true,
  "data": null,
  "message": "用户角色更新成功"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "无效的用户角色",
  "message": "参数验证失败",
  "statusCode": 400
}
```

### 3. 获取用户详情

**接口地址**: `GET /api/users/{userId}`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数**:
- `userId` (string): 用户ID

**成功响应**:
```json
{
  "success": true,
  "data": {
    "_id": "f65d2db8-3672-46fb-862f-9a7888ad3eb8",
    "nickName": "测试用户",
    "phoneNumber": "13800138000",
    "email": "test@example.com",
    "role": "admin",
    "status": "active",
    "department": "技术部",
    "departmentId": "dept_001",
    "createTime": "2024-01-01T00:00:00.000Z",
    "updateTime": "2024-01-15T10:30:00.000Z"
  },
  "message": "获取用户详情成功"
}
```

## 角色权限说明

### 权限级别对比

| 角色 | 用户管理 | 角色管理 | 系统设置 | 数据统计 | 内容管理 |
|------|----------|----------|----------|----------|----------|
| user | ❌ | ❌ | ❌ | ❌ | 查看 |
| admin | 本部门 | ❌ | ❌ | 本部门 | 管理 |
| dept_admin | 本部门 | ❌ | ❌ | 本部门 | 管理 |
| sys_admin | 全部 | ✅ | ✅ | 全部 | 管理 |

### 角色更新权限

| 当前角色 | 可更新为 | 说明 |
|----------|----------|------|
| sys_admin | user, admin, dept_admin, sys_admin | 系统管理员可以更新任何角色 |
| admin | user, admin | 管理员只能更新为普通用户或保持管理员 |
| dept_admin | user, dept_admin | 部门管理员只能更新为普通用户或保持部门管理员 |
| user | user | 普通用户不能更新角色 |

## 前端集成示例

### 1. 角色选择组件

```javascript
// 角色选项配置
const roleOptions = [
  { value: 'user', label: '普通用户', description: '基础权限' },
  { value: 'admin', label: '管理员', description: '管理权限' },
  { value: 'dept_admin', label: '部门管理员', description: '部门级管理权限' },
  { value: 'sys_admin', label: '系统管理员', description: '系统级管理权限' }
];

// 角色选择器组件
const RoleSelector = ({ currentRole, onRoleChange, disabled }) => {
  return (
    <Select 
      value={currentRole} 
      onChange={onRoleChange}
      disabled={disabled}
      placeholder="选择角色"
    >
      {roleOptions.map(option => (
        <Option key={option.value} value={option.value}>
          <div>
            <div>{option.label}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {option.description}
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
};
```

### 2. 更新用户角色

```javascript
// 更新用户角色函数
const updateUserRole = async (userId, newRole) => {
  try {
    const response = await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    });
    
    const result = await response.json();
    
    if (result.success) {
      message.success('用户角色更新成功');
      // 刷新用户列表或更新本地状态
      refreshUserList();
    } else {
      message.error(result.message || '更新失败');
    }
  } catch (error) {
    console.error('更新用户角色失败:', error);
    message.error('网络错误，请重试');
  }
};
```

### 3. 角色权限检查

```javascript
// 检查用户是否有权限更新角色
const canUpdateRole = (currentUserRole, targetUserRole) => {
  const roleHierarchy = {
    'sys_admin': 4,
    'admin': 3,
    'dept_admin': 2,
    'user': 1
  };
  
  // 只有系统管理员可以更新任何角色
  if (currentUserRole === 'sys_admin') {
    return true;
  }
  
  // 其他角色只能更新权限级别低于自己的角色
  return roleHierarchy[currentUserRole] > roleHierarchy[targetUserRole];
};

// 使用示例
const userCanUpdate = canUpdateRole(currentUser.role, targetUser.role);
```

## 错误处理

### 常见错误码

| 错误码 | 错误信息 | 说明 | 解决方案 |
|--------|----------|------|----------|
| 400 | 无效的用户角色 | 角色值不在允许范围内 | 检查角色值是否为: user, admin, dept_admin, sys_admin |
| 401 | 请先登录 | 未提供有效的认证token | 重新登录获取token |
| 403 | 权限不足，需要系统管理员权限 | 当前用户没有更新角色的权限 | 使用系统管理员账号操作 |
| 404 | 用户不存在 | 指定的用户ID不存在 | 检查用户ID是否正确 |
| 500 | 用户角色更新失败 | 服务器内部错误 | 联系技术支持 |

### 错误处理示例

```javascript
const handleUpdateRole = async (userId, newRole) => {
  try {
    await updateUserRole(userId, newRole);
  } catch (error) {
    switch (error.statusCode) {
      case 400:
        message.error('无效的角色值，请重新选择');
        break;
      case 401:
        message.error('登录已过期，请重新登录');
        // 跳转到登录页
        router.push('/login');
        break;
      case 403:
        message.error('权限不足，无法更新用户角色');
        break;
      case 404:
        message.error('用户不存在');
        break;
      default:
        message.error('更新失败，请重试');
    }
  }
};
```

## 注意事项

1. **权限控制**: 只有系统管理员（sys_admin）可以更新用户角色
2. **角色验证**: 系统会验证角色值是否在允许的范围内
3. **数据一致性**: 更新角色后，用户的权限会立即生效
4. **审计日志**: 所有角色更新操作都会记录在系统日志中
5. **前端验证**: 建议在前端也进行角色值的验证，提升用户体验

## 更新日志

- **2024-01-15**: 修复admin角色更新问题，添加dept_admin角色支持
- **2024-01-10**: 初始版本，支持基本的角色管理功能

---

**文档版本**: v1.1  
**最后更新**: 2024-01-15  
**维护人员**: 开发团队
