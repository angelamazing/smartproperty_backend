# 智慧物业管理系统 - 测试接口API文档

## 概述

本文档描述了智慧物业管理系统新增的测试登录接口，这些接口仅在开发环境可用，用于前端开发和测试。

## 基础信息

- **基础URL**: `http://localhost:3000/api`
- **认证方式**: 无需认证（测试接口）
- **环境限制**: 仅在开发环境可用
- **响应格式**: JSON

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功消息",
  "data": {
    // 响应数据
  }
}
```

### 失败响应
```json
{
  "success": false,
  "message": "错误消息",
  "error": "错误详情"
}
```

## 测试登录接口

### 1. 普通用户测试登录

**接口地址**: `POST /api/auth/test-login`

**功能描述**: 提供普通用户权限的测试登录功能

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "message": "测试登录成功",
  "data": {
    "token": "test_token_123456789",
    "userInfo": {
      "_id": "test_user_id_123",
      "nickName": "测试用户",
      "role": "user",
      "department": "测试部门",
      "isTestUser": true
    },
    "isTestLogin": true
  }
}
```

**权限说明**: 普通用户权限，可以查看基本信息，进行基本的报餐和预约操作。

---

### 2. 部门管理员测试登录

**接口地址**: `POST /api/auth/test-login-admin`

**功能描述**: 提供部门管理员权限的测试登录功能

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "message": "部门管理员测试登录成功",
  "data": {
    "token": "admin_token_123456789",
    "userInfo": {
      "_id": "test_admin_id_123",
      "nickName": "部门管理员",
      "avatarUrl": "https://via.placeholder.com/100x100?text=Admin",
      "role": "dept_admin",
      "department": "测试部门",
      "permissions": [
        "user.view",
        "dining.manage",
        "reservation.audit",
        "venue.manage"
      ],
      "isTestUser": true,
      "isAdminTest": true
    },
    "isTestLogin": true
  }
}
```

**权限说明**: 部门管理员权限包括：
- 管理部门成员报餐
- 审核特殊预约申请
- 查看部门统计数据
- 管理场地预约（部分权限）

---

### 3. 系统管理员测试登录

**接口地址**: `POST /api/auth/test-login-sys-admin`

**功能描述**: 提供系统管理员权限的测试登录功能

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "message": "系统管理员测试登录成功",
  "data": {
    "token": "sys_admin_token_123456789",
    "userInfo": {
      "_id": "test_sys_admin_id_123",
      "nickName": "系统管理员",
      "avatarUrl": "https://via.placeholder.com/100x100?text=SysAdmin",
      "role": "sys_admin",
      "department": "测试部门",
      "permissions": [
        "user.manage",
        "system.manage",
        "dining.manage",
        "reservation.manage",
        "venue.manage",
        "verification.manage"
      ],
      "isTestUser": true,
      "isSysAdminTest": true
    },
    "isTestLogin": true
  }
}
```

**权限说明**: 系统管理员权限包括：
- 所有用户管理权限
- 系统配置管理
- 所有业务模块管理
- 数据统计查看

## 错误码说明

| HTTP状态码 | 错误码 | 说明 |
|------------|--------|------|
| 403 | - | 该接口仅在开发环境可用 |
| 500 | - | 系统内部错误 |

## 使用说明

### 1. 环境要求
- 确保 `NODE_ENV=development`
- 确保测试登录功能已启用

### 2. 前端集成
```javascript
// 部门管理员测试登录
const adminLogin = async () => {
  try {
    const response = await fetch('/api/auth/test-login-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 保存Token和用户信息
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('userInfo', JSON.stringify(result.data.userInfo));
      
      // 跳转到管理页面
      window.location.href = '/admin';
    }
  } catch (error) {
    console.error('测试登录失败:', error);
  }
};

// 系统管理员测试登录
const sysAdminLogin = async () => {
  try {
    const response = await fetch('/api/auth/test-login-sys-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 保存Token和用户信息
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('userInfo', JSON.stringify(result.data.userInfo));
      
      // 跳转到系统管理页面
      window.location.href = '/system-admin';
    }
  } catch (error) {
    console.error('测试登录失败:', error);
  }
};
```

### 3. 权限验证
```javascript
// 检查用户权限
const checkPermission = (permission) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const permissions = userInfo.permissions || [];
  
  return permissions.includes(permission);
};

// 使用示例
if (checkPermission('dining.manage')) {
  // 显示报餐管理功能
  showDiningManagement();
}
```

## 安全注意事项

1. **仅开发环境可用**: 生产环境会自动禁用这些接口
2. **Token有效期**: 测试Token有效期为24小时
3. **权限隔离**: 测试用户权限严格按照角色配置
4. **日志记录**: 所有测试登录操作都会记录日志

## 测试验证

### 1. 接口可用性测试
```bash
# 测试部门管理员登录
curl -X POST http://localhost:3000/api/auth/test-login-admin \
  -H "Content-Type: application/json"

# 测试系统管理员登录
curl -X POST http://localhost:3000/api/auth/test-login-sys-admin \
  -H "Content-Type: application/json"
```

### 2. 权限验证测试
```bash
# 使用返回的Token访问受保护的接口
curl -X GET http://localhost:3000/api/user/stats \
  -H "Authorization: Bearer YOUR_TEST_TOKEN"
```

### 3. 环境限制测试
```bash
# 在生产环境测试（应该返回403错误）
NODE_ENV=production curl -X POST http://localhost:3000/api/auth/test-login-admin \
  -H "Content-Type: application/json"
```

## 常见问题

### Q: 为什么测试登录接口返回403错误？
A: 请检查以下几点：
1. 确保 `NODE_ENV=development`
2. 确保测试登录功能已启用
3. 检查配置文件中的设置

### Q: 测试用户的Token有效期是多久？
A: 测试用户的Token有效期为24小时，比普通用户的7天要短。

### Q: 如何区分不同类型的测试用户？
A: 通过用户信息中的字段区分：
- `isTestUser`: 是否为测试用户
- `isAdminTest`: 是否为部门管理员测试用户
- `isSysAdminTest`: 是否为系统管理员测试用户

### Q: 测试用户数据会影响生产数据吗？
A: 不会，测试用户数据有独立的标识字段，不会与生产数据混淆。

## 技术支持

如有技术问题，请联系开发团队。

---

*本文档版本: v1.0.0*  
*最后更新: 2024年1月15日*
