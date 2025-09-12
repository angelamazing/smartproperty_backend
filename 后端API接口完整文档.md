# 后端API接口完整文档

## 概述

本文档详细描述了后端系统的所有API接口，包括请求方法、参数、权限要求和返回数据格式。

**基础URL**: `http://localhost:3000/api`

## 统一响应格式

```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "code": "200",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**错误响应格式**:
```json
{
  "success": false,
  "message": "错误信息",
  "data": null,
  "code": "400",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 用户角色说明

- `user`: 普通用户
- `admin`: 管理员
- `dept_admin`: 部门管理员
- `sys_admin`: 系统管理员

---

## 1. 认证相关接口

### 1.1 微信授权登录
**接口**: `POST /api/auth/wechat-login`  
**权限**: 无需认证  
**描述**: 通过微信授权码登录

**请求参数**:
```json
{
  "code": "微信授权码",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL",
    "gender": 1
  }
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "token": "JWT令牌",
    "userInfo": {
      "_id": "用户ID",
      "nickName": "用户昵称",
      "avatarUrl": "头像URL",
      "phoneNumber": "手机号",
      "role": "user",
      "status": "active"
    }
  }
}
```

### 1.2 手机号验证码登录
**接口**: `POST /api/auth/phone-login`  
**权限**: 无需认证  
**描述**: 通过手机号和验证码登录

**请求参数**:
```json
{
  "phoneNumber": "手机号",
  "verificationCode": "验证码"
}
```

**返回数据**: 同微信登录

### 1.3 手机号密码登录
**接口**: `POST /api/auth/phone-password-login`  
**权限**: 无需认证  
**描述**: 通过手机号和密码登录

**请求参数**:
```json
{
  "phoneNumber": "手机号",
  "password": "密码"
}
```

**返回数据**: 同微信登录

### 1.4 发送验证码
**接口**: `POST /api/auth/send-verification-code`  
**权限**: 无需认证  
**描述**: 发送手机验证码

**请求参数**:
```json
{
  "phoneNumber": "手机号"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "expiresIn": 300
  },
  "message": "验证码发送成功"
}
```

### 1.5 Token验证
**接口**: `POST /api/auth/validate-token`  
**权限**: 无需认证  
**描述**: 验证Token有效性

**请求参数**:
```json
{
  "token": "JWT令牌"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "userInfo": {
      "_id": "用户ID",
      "nickName": "用户昵称",
      "role": "user"
    }
  }
}
```

### 1.6 用户登出
**接口**: `POST /api/auth/logout`  
**权限**: 可选认证  
**描述**: 用户登出

**返回数据**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

## 2. 用户管理接口

### 2.1 获取当前用户信息
**接口**: `GET /api/user/info`  
**权限**: 需要认证  
**描述**: 获取当前登录用户的详细信息

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "用户ID",
    "nickName": "用户昵称",
    "realName": "真实姓名",
    "phoneNumber": "手机号",
    "email": "邮箱",
    "avatarUrl": "头像URL",
    "gender": 1,
    "departmentId": "部门ID",
    "departmentName": "部门名称",
    "role": "user",
    "position": "职位",
    "employeeId": "员工编号",
    "joinDate": "2024-01-01",
    "status": "active",
    "createTime": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.2 获取用户统计数据
**接口**: `GET /api/user/stats`  
**权限**: 需要认证  
**描述**: 获取当前用户的统计数据

**返回数据**:
```json
{
  "success": true,
  "data": {
    "totalDiningOrders": 50,
    "totalReservations": 10,
    "thisMonthDining": 15,
    "thisMonthReservations": 3
  }
}
```

### 2.3 更新用户头像
**接口**: `PUT /api/user/avatar`  
**权限**: 需要认证  
**描述**: 更新用户头像

**请求参数**:
```json
{
  "avatarUrl": "新头像URL"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "头像更新成功"
}
```

### 2.4 更新用户资料
**接口**: `PUT /api/user/profile`  
**权限**: 需要认证  
**描述**: 更新用户基本信息

**请求参数**:
```json
{
  "realName": "真实姓名",
  "email": "邮箱",
  "gender": 1,
  "position": "职位"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "资料更新成功"
}
```

### 2.5 修改密码
**接口**: `PUT /api/user/change-password`  
**权限**: 需要认证  
**描述**: 修改用户密码

**请求参数**:
```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

### 2.6 获取用户列表（管理员）
**接口**: `GET /api/user/list`  
**权限**: 部门管理员及以上  
**描述**: 获取用户列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `keyword`: 搜索关键词
- `role`: 角色筛选
- `status`: 状态筛选
- `departmentId`: 部门筛选

**返回数据**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "用户ID",
        "nickName": "用户昵称",
        "realName": "真实姓名",
        "phoneNumber": "手机号",
        "role": "user",
        "departmentName": "部门名称",
        "status": "active",
        "createTime": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2.7 更新用户角色（系统管理员）
**接口**: `PUT /api/user/:userId/role`  
**权限**: 系统管理员  
**描述**: 更新用户角色

**请求参数**:
```json
{
  "role": "user|admin|dept_admin|sys_admin"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "用户角色更新成功"
}
```

---

## 3. 部门管理接口

### 3.1 获取部门列表
**接口**: `GET /api/department/list`  
**权限**: 需要认证  
**描述**: 获取所有部门列表

**查询参数**:
- `status`: 状态筛选（默认active）
- `includeManager`: 是否包含管理员信息（默认true）

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "部门ID",
      "name": "部门名称",
      "code": "部门编码",
      "description": "部门描述",
      "level": 1,
      "status": "active",
      "memberCount": 25,
      "manager": {
        "_id": "管理员ID",
        "nickName": "管理员姓名",
        "phoneNumber": "手机号"
      },
      "createTime": "2024-01-01T00:00:00.000Z",
      "updateTime": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3.2 获取当前用户部门信息
**接口**: `GET /api/department/my`  
**权限**: 需要认证  
**描述**: 获取当前用户所属部门信息

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "部门ID",
    "name": "部门名称",
    "code": "部门编码",
    "description": "部门描述",
    "level": 1,
    "status": "active",
    "memberCount": 25,
    "manager": {
      "_id": "管理员ID",
      "nickName": "管理员姓名",
      "phoneNumber": "手机号"
    }
  }
}
```

### 3.3 获取部门详情
**接口**: `GET /api/department/:departmentId`  
**权限**: 需要认证  
**描述**: 获取指定部门详情

**返回数据**: 同部门列表单项

### 3.4 获取部门成员列表
**接口**: `GET /api/department/:departmentId/members`  
**权限**: 部门管理员及以上  
**描述**: 获取部门成员列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `status`: 状态筛选
- `role`: 角色筛选
- `keyword`: 搜索关键词

**返回数据**:
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "_id": "用户ID",
        "nickName": "用户昵称",
        "realName": "真实姓名",
        "phoneNumber": "手机号",
        "role": "user",
        "position": "职位",
        "status": "active",
        "joinDate": "2024-01-01"
      }
    ],
    "total": 25,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.5 创建部门（系统管理员）
**接口**: `POST /api/department`  
**权限**: 系统管理员  
**描述**: 创建新部门

**请求参数**:
```json
{
  "name": "部门名称",
  "code": "部门编码",
  "description": "部门描述",
  "level": 1,
  "status": "active"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "新部门ID",
    "name": "部门名称",
    "code": "部门编码"
  },
  "message": "部门创建成功"
}
```

### 3.6 更新部门信息（系统管理员）
**接口**: `PUT /api/department/:departmentId`  
**权限**: 系统管理员  
**描述**: 更新部门信息

**请求参数**:
```json
{
  "name": "新部门名称",
  "description": "新部门描述",
  "status": "active"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "部门信息更新成功"
}
```

---

## 4. 餐饮管理接口

### 4.1 获取菜单信息
**接口**: `GET /api/dining/menu`  
**权限**: 需要认证  
**描述**: 获取指定日期的菜单信息

**查询参数**:
- `date`: 日期（格式：YYYY-MM-DD）
- `mealType`: 餐次类型（breakfast|lunch|dinner）

**返回数据**:
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "mealType": "lunch",
    "dishes": [
      {
        "_id": "菜品ID",
        "name": "菜品名称",
        "price": 15.5,
        "image": "菜品图片URL",
        "category": "分类名称",
        "description": "菜品描述"
      }
    ]
  }
}
```

### 4.2 获取部门成员
**接口**: `GET /api/dining/dept-members`  
**权限**: 需要认证  
**描述**: 获取当前用户部门的成员列表

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "用户ID",
      "nickName": "用户昵称",
      "realName": "真实姓名",
      "status": "active"
    }
  ]
}
```

### 4.3 提交部门报餐
**接口**: `POST /api/dining/dept-order`  
**权限**: 需要认证  
**描述**: 提交部门报餐订单

**请求参数**:
```json
{
  "date": "2024-01-15",
  "mealType": "lunch",
  "orders": [
    {
      "userId": "用户ID",
      "dishId": "菜品ID",
      "quantity": 1,
      "remark": "备注"
    }
  ]
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "orderId": "订单ID",
    "totalAmount": 155.5
  },
  "message": "报餐提交成功"
}
```

### 4.4 获取报餐记录
**接口**: `GET /api/dining/records`  
**权限**: 需要认证  
**描述**: 获取报餐记录列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `startDate`: 开始日期
- `endDate`: 结束日期
- `status`: 状态筛选

**返回数据**:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "记录ID",
        "date": "2024-01-15",
        "mealType": "lunch",
        "totalAmount": 155.5,
        "status": "confirmed",
        "orderCount": 10,
        "createTime": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

### 4.5 获取个人报餐状态
**接口**: `GET /api/dining/personal-status`  
**权限**: 需要认证  
**描述**: 获取个人报餐状态

**查询参数**:
- `date`: 日期（格式：YYYY-MM-DD）

**返回数据**:
```json
{
  "success": true,
  "data": {
    "hasOrdered": true,
    "orders": [
      {
        "_id": "订单ID",
        "dishName": "菜品名称",
        "quantity": 1,
        "price": 15.5,
        "status": "confirmed"
      }
    ],
    "totalAmount": 15.5
  }
}
```

### 4.6 取消报餐订单
**接口**: `PUT /api/dining/orders/:orderId/cancel`  
**权限**: 需要认证  
**描述**: 取消报餐订单

**返回数据**:
```json
{
  "success": true,
  "message": "订单取消成功"
}
```

---

## 5. 菜品管理接口

### 5.1 获取菜品列表
**接口**: `GET /api/dishes`  
**权限**: 需要认证  
**描述**: 获取菜品列表

**查询参数**:
- `page`: 页码（默认1）
- `size`: 每页数量（默认20）
- `categoryId`: 分类ID
- `keyword`: 搜索关键词
- `status`: 状态筛选
- `minPrice`: 最低价格
- `maxPrice`: 最高价格

**返回数据**:
```json
{
  "success": true,
  "data": {
    "dishes": [
      {
        "_id": "菜品ID",
        "name": "菜品名称",
        "price": 15.5,
        "image": "菜品图片URL",
        "category": "分类名称",
        "description": "菜品描述",
        "status": "active",
        "isRecommended": false
      }
    ],
    "total": 100,
    "page": 1,
    "size": 20
  }
}
```

### 5.2 获取菜品分类
**接口**: `GET /api/dishes/categories`  
**权限**: 需要认证  
**描述**: 获取菜品分类列表

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "分类ID",
      "name": "分类名称",
      "description": "分类描述",
      "icon": "图标",
      "color": "#FF5733",
      "sort": 1,
      "status": "active"
    }
  ]
}
```

### 5.3 创建菜品（管理员）
**接口**: `POST /api/dishes`  
**权限**: 部门管理员及以上  
**描述**: 创建新菜品

**请求参数**:
```json
{
  "name": "菜品名称",
  "categoryId": "分类ID",
  "description": "菜品描述",
  "price": 15.5,
  "image": "菜品图片URL",
  "status": "active",
  "isRecommended": false
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "新菜品ID",
    "name": "菜品名称"
  },
  "message": "菜品创建成功"
}
```

### 5.4 更新菜品（管理员）
**接口**: `PUT /api/dishes/:dishId`  
**权限**: 部门管理员及以上  
**描述**: 更新菜品信息

**请求参数**: 同创建菜品

**返回数据**:
```json
{
  "success": true,
  "message": "菜品更新成功"
}
```

---

## 6. 场地预约接口

### 6.1 获取场地列表
**接口**: `GET /api/venue/list`  
**权限**: 需要认证  
**描述**: 获取可预约场地列表

**查询参数**:
- `type`: 场地类型
- `status`: 状态筛选
- `date`: 预约日期

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "场地ID",
      "name": "场地名称",
      "type": "篮球场",
      "description": "场地描述",
      "location": "位置信息",
      "capacity": 20,
      "pricePerHour": 100,
      "features": ["空调", "灯光"],
      "image": "场地图片URL",
      "openTime": "08:00",
      "closeTime": "22:00",
      "workingDays": [1, 2, 3, 4, 5],
      "status": "active"
    }
  ]
}
```

### 6.2 提交场地预约
**接口**: `POST /api/venue/reservation`  
**权限**: 需要认证  
**描述**: 提交场地预约申请

**请求参数**:
```json
{
  "venueId": "场地ID",
  "date": "2024-01-15",
  "startTime": "14:00",
  "endTime": "16:00",
  "purpose": "团建活动",
  "participantCount": 15,
  "contactPhone": "联系电话"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "reservationId": "预约ID",
    "totalAmount": 200
  },
  "message": "预约提交成功"
}
```

### 6.3 获取预约记录
**接口**: `GET /api/venue/reservations`  
**权限**: 需要认证  
**描述**: 获取用户的预约记录

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "预约ID",
      "venueName": "场地名称",
      "date": "2024-01-15",
      "startTime": "14:00",
      "endTime": "16:00",
      "status": "confirmed",
      "totalAmount": 200,
      "createTime": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## 7. 管理员接口

### 7.1 获取系统统计数据
**接口**: `GET /api/admin/system-stats`  
**权限**: 管理员  
**描述**: 获取系统整体统计数据

**返回数据**:
```json
{
  "success": true,
  "data": {
    "userCount": 500,
    "departmentCount": 20,
    "todayDiningOrders": 150,
    "todayReservations": 25,
    "activeUsers": 450,
    "pendingOrders": 10
  }
}
```

### 7.2 获取用户列表（管理员）
**接口**: `GET /api/admin/users`  
**权限**: 管理员  
**描述**: 获取所有用户列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `keyword`: 搜索关键词
- `role`: 角色筛选
- `status`: 状态筛选
- `departmentId`: 部门筛选

**返回数据**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "用户ID",
        "nickName": "用户昵称",
        "realName": "真实姓名",
        "phoneNumber": "手机号",
        "email": "邮箱",
        "role": "user",
        "departmentName": "部门名称",
        "status": "active",
        "joinDate": "2024-01-01",
        "createTime": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 500,
    "page": 1,
    "pageSize": 20
  }
}
```

### 7.3 创建用户（管理员）
**接口**: `POST /api/admin/users`  
**权限**: 管理员  
**描述**: 创建新用户

**请求参数**:
```json
{
  "realName": "真实姓名",
  "phoneNumber": "手机号",
  "email": "邮箱",
  "gender": 1,
  "departmentId": "部门ID",
  "position": "职位",
  "employeeId": "员工编号",
  "password": "初始密码",
  "roleId": "角色ID",
  "joinDate": "2024-01-01",
  "status": "active",
  "remark": "备注"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "新用户ID",
    "phoneNumber": "手机号"
  },
  "message": "用户创建成功"
}
```

### 7.4 更新用户信息（管理员）
**接口**: `PUT /api/admin/users/:userId`  
**权限**: 管理员  
**描述**: 更新用户信息

**请求参数**: 同创建用户（所有字段可选）

**返回数据**:
```json
{
  "success": true,
  "message": "用户信息更新成功"
}
```

### 7.5 删除用户（管理员）
**接口**: `DELETE /api/admin/users/:userId`  
**权限**: 管理员  
**描述**: 删除用户

**返回数据**:
```json
{
  "success": true,
  "message": "用户删除成功"
}
```

### 7.6 获取部门列表（管理员）
**接口**: `GET /api/admin/departments`  
**权限**: 管理员  
**描述**: 获取所有部门列表

**返回数据**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "部门ID",
      "name": "部门名称",
      "description": "部门描述",
      "parentId": "上级部门ID",
      "managerId": "管理员ID",
      "memberCount": 25,
      "status": "active",
      "createTime": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 7.7 创建部门（管理员）
**接口**: `POST /api/admin/departments`  
**权限**: 管理员  
**描述**: 创建新部门

**请求参数**:
```json
{
  "name": "部门名称",
  "description": "部门描述",
  "parentId": "上级部门ID",
  "managerId": "管理员ID",
  "sort": 1,
  "status": "active"
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "新部门ID",
    "name": "部门名称"
  },
  "message": "部门创建成功"
}
```

### 7.8 更新部门（管理员）
**接口**: `PUT /api/admin/departments/:deptId`  
**权限**: 管理员  
**描述**: 更新部门信息

**请求参数**: 同创建部门（所有字段可选）

**返回数据**:
```json
{
  "success": true,
  "message": "部门更新成功"
}
```

### 7.9 删除部门（管理员）
**接口**: `DELETE /api/admin/departments/:deptId`  
**权限**: 管理员  
**描述**: 删除部门

**返回数据**:
```json
{
  "success": true,
  "message": "部门删除成功"
}
```

### 7.10 获取菜品列表（管理员）
**接口**: `GET /api/admin/dishes`  
**权限**: 管理员  
**描述**: 获取所有菜品列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `keyword`: 搜索关键词
- `categoryId`: 分类ID
- `status`: 状态筛选

**返回数据**:
```json
{
  "success": true,
  "data": {
    "dishes": [
      {
        "_id": "菜品ID",
        "name": "菜品名称",
        "categoryId": "分类ID",
        "categoryName": "分类名称",
        "price": 15.5,
        "image": "菜品图片URL",
        "status": "active",
        "createTime": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 7.11 创建菜品（管理员）
**接口**: `POST /api/admin/dishes`  
**权限**: 管理员  
**描述**: 创建新菜品

**请求参数**:
```json
{
  "name": "菜品名称",
  "categoryId": "分类ID",
  "description": "菜品描述",
  "price": 15.5,
  "image": "菜品图片URL",
  "calories": 300,
  "protein": 20,
  "fat": 10,
  "carbohydrate": 40,
  "tags": ["素食", "清淡"],
  "status": "active",
  "isRecommended": false
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "新菜品ID",
    "name": "菜品名称"
  },
  "message": "菜品创建成功"
}
```

### 7.12 更新菜品状态（管理员）
**接口**: `PUT /api/admin/dishes/:dishId/status`  
**权限**: 管理员  
**描述**: 更新菜品状态

**请求参数**:
```json
{
  "status": "active|inactive"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "菜品状态更新成功"
}
```

### 7.13 删除菜品（管理员）
**接口**: `DELETE /api/admin/dishes/:dishId`  
**权限**: 管理员  
**描述**: 删除菜品

**返回数据**:
```json
{
  "success": true,
  "message": "菜品删除成功"
}
```

### 7.14 获取场地列表（管理员）
**接口**: `GET /api/admin/venues`  
**权限**: 管理员  
**描述**: 获取所有场地列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `keyword`: 搜索关键词
- `type`: 场地类型
- `status`: 状态筛选

**返回数据**:
```json
{
  "success": true,
  "data": {
    "venues": [
      {
        "_id": "场地ID",
        "name": "场地名称",
        "type": "篮球场",
        "capacity": 20,
        "pricePerHour": 100,
        "status": "active",
        "createTime": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

### 7.15 创建场地（管理员）
**接口**: `POST /api/admin/venues`  
**权限**: 管理员  
**描述**: 创建新场地

**请求参数**:
```json
{
  "name": "场地名称",
  "type": "篮球场",
  "description": "场地描述",
  "location": "位置信息",
  "capacity": 20,
  "pricePerHour": 100,
  "features": ["空调", "灯光"],
  "image": "场地图片URL",
  "openTime": "08:00",
  "closeTime": "22:00",
  "workingDays": [1, 2, 3, 4, 5],
  "advanceBookingDays": 7,
  "minBookingHours": 1,
  "maxBookingHours": 4,
  "requireApproval": true,
  "allowCancellation": true,
  "status": "active",
  "sort": 1
}
```

**返回数据**:
```json
{
  "success": true,
  "data": {
    "_id": "新场地ID",
    "name": "场地名称"
  },
  "message": "场地创建成功"
}
```

### 7.16 获取预约列表（管理员）
**接口**: `GET /api/admin/reservations`  
**权限**: 管理员  
**描述**: 获取所有预约列表

**查询参数**:
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）
- `date`: 预约日期
- `venueName`: 场地名称
- `status`: 状态筛选

**返回数据**:
```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "_id": "预约ID",
        "venueName": "场地名称",
        "userName": "用户姓名",
        "date": "2024-01-15",
        "startTime": "14:00",
        "endTime": "16:00",
        "status": "pending",
        "totalAmount": 200,
        "createTime": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 7.17 确认预约（管理员）
**接口**: `PUT /api/admin/reservations/:reservationId/confirm`  
**权限**: 管理员  
**描述**: 确认预约申请

**返回数据**:
```json
{
  "success": true,
  "message": "预约确认成功"
}
```

### 7.18 拒绝预约（管理员）
**接口**: `PUT /api/admin/reservations/:reservationId/reject`  
**权限**: 管理员  
**描述**: 拒绝预约申请

**请求参数**:
```json
{
  "reason": "拒绝原因"
}
```

**返回数据**:
```json
{
  "success": true,
  "message": "预约拒绝成功"
}
```

---

## 8. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

## 9. 请求头说明

### 认证头
```
Authorization: Bearer <JWT_TOKEN>
```

### 内容类型
```
Content-Type: application/json
```

## 10. 分页参数说明

所有支持分页的接口都使用以下参数：

- `page`: 页码，从1开始（默认1）
- `pageSize`: 每页数量（默认20，最大100）

返回数据中包含：
- `total`: 总记录数
- `page`: 当前页码
- `pageSize`: 每页数量

## 11. 日期时间格式

- 日期格式：`YYYY-MM-DD`（如：2024-01-15）
- 时间格式：`HH:mm`（如：14:30）
- 完整时间格式：`YYYY-MM-DDTHH:mm:ss.sssZ`（如：2024-01-15T14:30:00.000Z）

## 12. 状态值说明

### 用户状态
- `active`: 正常
- `inactive`: 禁用
- `pending`: 待审核
- `suspended`: 暂停

### 订单状态
- `pending`: 待确认
- `confirmed`: 已确认
- `rejected`: 已拒绝
- `cancelled`: 已取消

### 预约状态
- `pending`: 待审核
- `confirmed`: 已确认
- `rejected`: 已拒绝
- `cancelled`: 已取消

### 通用状态
- `active`: 启用
- `inactive`: 禁用
- `draft`: 草稿
- `published`: 已发布
- `archived`: 已归档

---

**文档版本**: v1.0  
**最后更新**: 2024-01-15  
**维护人员**: AI助手
