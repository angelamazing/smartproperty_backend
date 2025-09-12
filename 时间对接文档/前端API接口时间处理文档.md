# 前端API接口时间处理文档

## 📋 概述

本文档详细说明前端与后端API接口交互时的时间处理规范，确保时间数据在传输过程中的一致性和准确性。

## 🎯 时间处理原则

### 核心原则
1. **后端存储**：统一使用UTC时间
2. **API传输**：使用ISO 8601格式
3. **前端显示**：转换为北京时间显示
4. **前端提交**：将北京时间转换为UTC时间

### 时间格式约定
- **API请求/响应**：`2024-01-15T10:30:00.000Z`（UTC时间）
- **前端显示**：`2024-01-15 18:30:00`（北京时间）
- **仅日期字段**：`2024-01-15`（YYYY-MM-DD格式）
- **仅时间字段**：`14:30`（HH:mm格式）

## 🔧 API接口规范

### 1. 报餐相关接口

#### 1.1 提交报餐
```http
POST /api/dining/orders
Content-Type: application/json

{
  "diningDate": "2024-01-15",                    // 仅日期
  "mealType": "dinner",                          // 餐次类型
  "memberIds": ["user1", "user2"],              // 成员ID列表
  "remark": "备注信息"                           // 备注
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "diningDate": "2024-01-15",
    "mealType": "dinner",
    "createTime": "2024-01-15T10:30:00.000Z",   // UTC时间
    "updateTime": "2024-01-15T10:30:00.000Z",   // UTC时间
    "status": "pending",
    "diningStatus": "ordered"
  }
}
```

#### 1.2 获取报餐列表
```http
GET /api/dining/orders?date=2024-01-15&mealType=dinner
```

**响应格式**：
```json
{
  "success": true,
  "data": [
    {
      "orderId": "order-123",
      "diningDate": "2024-01-15",
      "mealType": "dinner",
      "createTime": "2024-01-15T10:30:00.000Z",   // UTC时间
      "updateTime": "2024-01-15T10:30:00.000Z",   // UTC时间
      "actualDiningTime": "2024-01-15T18:30:00.000Z", // UTC时间
      "status": "confirmed",
      "diningStatus": "dined"
    }
  ]
}
```

### 2. 确认就餐接口

#### 2.1 手动确认就餐
```http
POST /api/dining/confirm
Content-Type: application/json

{
  "orderId": "order-123",
  "confirmationType": "manual"
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "confirmationType": "manual",
    "actualDiningTime": "2024-01-15T18:30:00.000Z", // UTC时间
    "message": "确认就餐成功"
  }
}
```

#### 2.2 扫码确认就餐
```http
POST /api/dining/confirm/qr
Content-Type: application/json

{
  "qrCode": "qr-code-data",
  "orderId": "order-123"
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "confirmationType": "qr",
    "actualDiningTime": "2024-01-15T18:30:00.000Z", // UTC时间
    "message": "扫码确认就餐成功"
  }
}
```

### 3. 菜单相关接口

#### 3.1 获取菜单信息
```http
GET /api/menus?date=2024-01-15&mealType=dinner
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "menuId": "menu-123",
    "publishDate": "2024-01-15",
    "mealType": "dinner",
    "publishTime": "2024-01-15T08:00:00.000Z",    // UTC时间
    "publishStatus": "published",
    "dishes": [
      {
        "dishId": "dish-1",
        "name": "宫保鸡丁",
        "price": 15.00
      }
    ]
  }
}
```

#### 3.2 发布菜单
```http
POST /api/menus
Content-Type: application/json

{
  "publishDate": "2024-01-15",
  "mealType": "dinner",
  "dishes": [
    {
      "name": "宫保鸡丁",
      "price": 15.00
    }
  ]
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "menuId": "menu-123",
    "publishDate": "2024-01-15",
    "mealType": "dinner",
    "publishTime": "2024-01-15T08:00:00.000Z",    // UTC时间
    "publishStatus": "published"
  }
}
```

## 🎨 前端处理示例

### 1. 时间格式化显示

```javascript
import { TimeUtils } from '@/utils/frontend-time-utils';

// API返回的数据
const apiResponse = {
  orderId: 'order-123',
  createTime: '2024-01-15T10:30:00.000Z',  // UTC时间
  updateTime: '2024-01-15T14:25:30.500Z',  // UTC时间
  actualDiningTime: '2024-01-15T18:30:00.000Z'  // UTC时间
};

// 转换为北京时间显示
const displayData = {
  ...apiResponse,
  createTimeDisplay: TimeUtils.formatTime(apiResponse.createTime, 'YYYY-MM-DD HH:mm'),
  updateTimeDisplay: TimeUtils.getRelativeTime(apiResponse.updateTime),
  actualDiningTimeDisplay: TimeUtils.formatTime(apiResponse.actualDiningTime, 'YYYY-MM-DD HH:mm:ss')
};

console.log(displayData);
// 输出:
// {
//   orderId: 'order-123',
//   createTime: '2024-01-15T10:30:00.000Z',
//   updateTime: '2024-01-15T14:25:30.500Z',
//   actualDiningTime: '2024-01-15T18:30:00.000Z',
//   createTimeDisplay: '2024-01-15 18:30',
//   updateTimeDisplay: '3小时前',
//   actualDiningTimeDisplay: '2024-01-15 18:30:00'
// }
```

### 2. 表单提交处理

```javascript
// 用户填写的表单数据
const formData = {
  diningDate: '2024-01-15',           // 用户选择的日期
  mealType: 'dinner',                 // 餐次类型
  eventTime: '2024-01-15 18:30:00',   // 用户选择的时间（北京时间）
  deadline: '2024-01-20 18:00:00'     // 截止时间（北京时间）
};

// 转换为API请求格式
const apiRequest = {
  diningDate: formData.diningDate,                    // 日期直接使用
  mealType: formData.mealType,                        // 餐次类型直接使用
  eventTime: TimeUtils.toUTCForSubmit(formData.eventTime),    // 转换为UTC时间
  deadline: TimeUtils.toUTCForSubmit(formData.deadline)       // 转换为UTC时间
};

console.log(apiRequest);
// 输出:
// {
//   diningDate: '2024-01-15',
//   mealType: 'dinner',
//   eventTime: '2024-01-15T10:30:00.000Z',
//   deadline: '2024-01-20T10:00:00.000Z'
// }
```

### 3. 时间范围查询

```javascript
// 查询指定日期的数据
const queryDate = '2024-01-15';

// 生成时间范围查询参数
const queryParams = {
  startTime: TimeUtils.getDayStartTime(queryDate),  // 2024-01-15T00:00:00.000Z
  endTime: TimeUtils.getDayEndTime(queryDate)       // 2024-01-15T23:59:59.999Z
};

// API请求
const response = await fetch(`/api/dining/orders?startTime=${queryParams.startTime}&endTime=${queryParams.endTime}`);
```

### 4. 时间验证

```javascript
// 验证报餐时间
const validateDiningTime = (diningDate, mealType) => {
  // 检查日期是否为过去
  if (TimeUtils.isPastDate(diningDate)) {
    return { valid: false, message: '不能为过去的日期报餐' };
  }
  
  // 检查是否为今天且在当前餐次时间内
  if (TimeUtils.isToday(diningDate)) {
    const now = new Date();
    const currentHour = now.getHours();
    
    const mealTimeRanges = {
      'breakfast': { start: 6, end: 10 },
      'lunch': { start: 11, end: 14 },
      'dinner': { start: 17, end: 20 }
    };
    
    const range = mealTimeRanges[mealType];
    if (range && (currentHour < range.start || currentHour > range.end)) {
      return { valid: false, message: `当前时间不在${mealType}报餐时间内` };
    }
  }
  
  return { valid: true };
};

// 使用示例
const validation = validateDiningTime('2024-01-15', 'dinner');
if (!validation.valid) {
  console.error(validation.message);
}
```

## 🔄 数据转换流程

### 1. 获取数据流程
```
后端数据库(UTC) → API响应(UTC) → 前端接收(UTC) → 前端显示(北京时间)
```

### 2. 提交数据流程
```
用户输入(北京时间) → 前端转换(UTC) → API请求(UTC) → 后端存储(UTC)
```

### 3. 时间转换示例

```javascript
// 1. 后端返回UTC时间
const utcTime = '2024-01-15T10:30:00.000Z';

// 2. 前端转换为北京时间显示
const beijingTime = TimeUtils.formatTime(utcTime, 'YYYY-MM-DD HH:mm:ss');
// 结果: '2024-01-15 18:30:00'

// 3. 用户修改时间
const userInput = '2024-01-15 19:00:00';

// 4. 前端转换为UTC时间提交
const utcSubmit = TimeUtils.toUTCForSubmit(userInput);
// 结果: '2024-01-15T11:00:00.000Z'
```

## ⚠️ 注意事项

### 1. 时区处理
- 所有API接口返回的时间都是UTC时间
- 前端必须使用TimeUtils工具类进行时区转换
- 禁止直接使用原生Date对象处理时间

### 2. 时间格式
- API请求和响应必须使用ISO 8601格式
- 日期字段使用YYYY-MM-DD格式
- 时间字段使用HH:mm格式

### 3. 错误处理
- 使用TimeUtils.safeFormatTime()进行安全格式化
- 验证时间格式的有效性
- 处理空值和无效时间

### 4. 性能优化
- 大量数据渲染时使用TimeCache缓存
- 避免重复的时间格式化计算
- 使用延迟格式化优化渲染性能

## 🧪 测试用例

### 1. 时间格式化测试
```javascript
// 测试UTC时间转换为北京时间
const testCases = [
  {
    input: '2024-01-15T10:30:00.000Z',
    expected: '2024-01-15 18:30:00',
    description: 'UTC时间转换为北京时间'
  },
  {
    input: '2024-01-15T00:00:00.000Z',
    expected: '2024-01-15 08:00:00',
    description: 'UTC午夜转换为北京时间上午'
  }
];

testCases.forEach(({ input, expected, description }) => {
  const result = TimeUtils.formatTime(input, 'YYYY-MM-DD HH:mm:ss');
  console.log(`${description}: ${result === expected ? '✅' : '❌'}`);
});
```

### 2. 时间提交测试
```javascript
// 测试北京时间转换为UTC时间
const submitTestCases = [
  {
    input: '2024-01-15 18:30:00',
    expected: '2024-01-15T10:30:00.000Z',
    description: '北京时间转换为UTC时间'
  },
  {
    input: '2024-01-15 08:00:00',
    expected: '2024-01-15T00:00:00.000Z',
    description: '北京时间上午转换为UTC午夜'
  }
];

submitTestCases.forEach(({ input, expected, description }) => {
  const result = TimeUtils.toUTCForSubmit(input);
  console.log(`${description}: ${result === expected ? '✅' : '❌'}`);
});
```

## 📞 技术支持

如有问题，请参考：
- [前端时间处理对接完整文档](./前端时间处理对接完整文档.md)
- [前端对接快速指南](./前端对接快速指南.md)
- [统一时间处理方案及前端对接文档](./统一时间处理方案及前端对接文档.md)

---

**注意**：本文档基于统一时间处理方案，请确保后端API也遵循相应的时间处理规范。