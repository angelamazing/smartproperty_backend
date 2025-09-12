# 部门报餐API接口列表

## 基础信息
- **基础URL**: `http://localhost:3000`
- **认证方式**: JWT Token (Bearer Token)
- **数据格式**: JSON

## 接口列表

### 1. 部门管理员登录

#### 1.1 通用部门管理员登录
```
POST /api/auth/test-login-admin
```
**参数**: `{ "phoneNumber": "13800001001" }`
**返回**: Token + 用户信息

#### 1.2 指定部门的部门管理员登录
```
POST /api/auth/test-login-dept-admin
```
**参数**: `{ "departmentCode": "GEO_DATA" }`
**返回**: Token + 用户信息

**部门代码**: GEO_DATA, GEO_ENG, ECO_ENV, GEO_ENV, GEO_SURVEY, HUANGMEI, MINING_CO, PROPERTY, ADMIN, TECH

### 2. 获取部门成员列表
```
GET /api/dining/enhanced/dept-members
```
**参数**: `?includeInactive=false&keyword=搜索词`
**返回**: 部门成员列表

### 3. 部门报餐
```
POST /api/dining/enhanced/department-order
```
**参数**: 
```json
{
  "date": "2025-09-02",
  "mealType": "lunch",
  "members": [{"userId": "用户ID"}],
  "remark": "备注"
}
```

### 4. 获取部门报餐记录
```
GET /api/dining/enhanced/department-orders
```
**参数**: `?date=2025-09-02&page=1&pageSize=20`

### 5. 获取部门报餐统计
```
GET /api/dining/enhanced/department-stats
```
**参数**: `?startDate=2025-09-01&endDate=2025-09-30`

### 6. 获取部门报餐概览
```
GET /api/dining/enhanced/department-overview
```
**返回**: 今日报餐情况概览

## 请求头示例
```javascript
headers: {
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
}
```

## 响应格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": { /* 具体数据 */ }
}
```

## 错误码
- `401`: 未授权
- `403`: 权限不足  
- `400`: 参数错误
- `500`: 服务器错误
