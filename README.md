# 智慧物业管理系统 - 统一时间处理方案

## 📋 项目概述

本项目是一个智慧物业管理系统，实现了完整的统一时间处理方案和球馆预约功能。系统解决了时间处理不一致、时区混乱等问题，并提供了完整的场地预约管理功能，支持分小时预约、场地管理、预约记录和场地安排等核心功能。

## 🎯 核心功能

### 1. 统一时间处理方案

#### 核心原则
1. **存储使用UTC时间**：所有时间数据在数据库中统一存储为UTC时间
2. **传输使用ISO 8601格式**：接口交互时使用ISO 8601标准格式
3. **显示使用北京时间**：所有用户界面显示的时间统一转换为北京时间(UTC+8)
4. **统一工具类**：前后端分别提供统一的时间处理工具类
5. **明确的时区处理**：所有时间操作都必须明确指定时区

### 2. 球馆预约系统

#### 核心功能
1. **分小时预约**：支持按小时为单位进行场地预约，自动检测时间冲突
2. **场馆管理**：完整的场地信息管理，支持多种场地类型（羽毛球、乒乓球、篮球、会议室等）
3. **预约记录**：用户预约历史记录，支持预约状态跟踪和管理
4. **场地安排**：实时场地使用时间表，支持预约冲突检测和统计

### 3. 菜单管理系统

#### 核心功能
1. **菜单草稿管理**：支持创建和编辑菜单草稿，时间验证防止过去日期
2. **菜单发布**：统一时间处理发布菜单，支持发布时间和生效时间设置
3. **菜品管理**：完整的菜品信息管理，支持分类、营养信息、价格等
4. **菜单历史**：菜单发布历史记录，支持按日期和餐次查询

#### 时间处理特点
- **草稿保存**：使用统一时间工具验证发布日期，防止保存过去日期
- **菜单发布**：自动设置发布时间和生效时间，支持UTC时间存储
- **时间转换**：前端显示北京时间，后端存储UTC时间，API传输ISO 8601格式

### 时间处理流程
```
用户操作(北京时间) → 前端转换为UTC → 后端存储UTC → 后端返回UTC → 前端转换为北京时间显示
```

## 🛠️ 技术实现

### 后端时间处理
- **工具库**：`moment-timezone`
- **工具类**：`utils/timeUtils.js`
- **存储格式**：UTC时间
- **返回格式**：ISO 8601格式的UTC时间

### 前端时间处理
- **工具库**：`dayjs`
- **工具类**：`utils/frontendTimeUtils.js`
- **显示格式**：北京时间
- **提交格式**：ISO 8601格式的UTC时间

### 球馆预约系统
- **服务层**：`services/venueService.js` - 处理预约业务逻辑
- **控制器**：`controllers/venueController.js` - 处理HTTP请求
- **路由**：`routes/venue.js` - 定义API接口
- **验证**：`utils/validation.js` - 数据验证规则
- **数据库**：`venues`、`reservations`、`time_slots` 表

### 菜单管理系统
- **服务层**：`services/adminService.js` - 处理菜单业务逻辑
- **控制器**：`controllers/adminController.js` - 处理HTTP请求
- **路由**：`routes/admin.js` - 定义API接口
- **验证**：`utils/validation.js` - 数据验证规则
- **数据库**：`menus`、`dishes`、`menu_dishes` 表

## 📁 文件结构

```
project/
├── README.md                                    # 项目说明文档
├── 统一时间处理方案及前端对接文档.md              # 完整时间处理规范文档
├── utils/
│   ├── timeUtils.js                            # 后端时间处理工具类
│   └── frontendTimeUtils.js                    # 前端时间处理工具类
├── examples/
│   ├── time-handling-examples.js               # 后端时间处理示例
│   └── frontend-time-examples.js               # 前端时间处理示例
├── services/
│   ├── diningService.js                        # 报餐服务（已修复时间处理）
│   └── diningConfirmationService.js            # 确认就餐服务（已修复时间处理）
└── controllers/
    └── diningController.js                     # 报餐控制器（已修复时间处理）
```

## 🚀 快速开始

### 1. 安装依赖
```bash
# 后端依赖
npm install moment-timezone mysql2

# 前端依赖
npm install dayjs
```

## 🏟️ 球馆预约系统API接口

### 场地管理接口

#### 获取场地列表
```http
GET /api/venue/list
```
**参数：**
- `date` (可选): 查询日期 (YYYY-MM-DD)
- `type` (可选): 场地类型 (badminton/pingpong/basketball/meeting/other)
- `page` (可选): 页码，默认1
- `pageSize` (可选): 每页数量，默认20

#### 获取场地详情
```http
GET /api/venue/:venueId
```

#### 获取场地时间安排
```http
GET /api/venue/:venueId/schedule?date=2024-01-15
```

#### 获取场地类型列表
```http
GET /api/venue/types
```

### 预约管理接口

#### 提交场地预约
```http
POST /api/venue/reservation
```
**请求体：**
```json
{
  "venueId": "venue_id",
  "date": "2024-01-15",
  "startTime": "09:00",
  "endTime": "11:00",
  "purpose": "羽毛球比赛",
  "remark": "备注信息",
  "participants": [
    {
      "name": "张三",
      "phone": "13800138000"
    }
  ]
}
```

#### 获取用户预约记录
```http
GET /api/venue/reservations
```
**参数：**
- `page` (可选): 页码
- `pageSize` (可选): 每页数量
- `status` (可选): 预约状态 (pending/confirmed/rejected/cancelled/completed)
- `date` (可选): 预约日期

#### 获取预约详情
```http
GET /api/venue/reservation/:reservationId
```

#### 取消预约
```http
DELETE /api/venue/reservation/:reservationId
```

#### 检查时间段可用性
```http
GET /api/venue/check-availability?venueId=xxx&date=2024-01-15&startTime=09:00&endTime=11:00
```

### 预约状态说明
- `pending`: 待审核
- `confirmed`: 已确认
- `rejected`: 已拒绝
- `cancelled`: 已取消
- `completed`: 已完成

## 🗑️ 菜单管理API接口

### 菜单操作接口

#### 删除菜单
```http
DELETE /api/admin/menu/:menuId
```
**路径参数：**
- `menuId` (必填): 菜单ID

**请求头：**
```http
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "success": true,
  "message": "删除菜单成功",
  "data": {
    "menuId": "menu_id_123",
    "status": "deleted"
  },
  "timestamp": "2025-09-16T12:50:17.000Z"
}
```

**注意事项：**
- 只有草稿状态的菜单可以删除
- 已发布的菜单需要先撤回才能删除
- 已撤回的菜单不能删除

#### 撤回菜单
```http
PUT /api/admin/menu/:menuId/revoke
```
**路径参数：**
- `menuId` (必填): 菜单ID

**请求头：**
```http
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "success": true,
  "message": "菜单撤回成功",
  "data": {
    "menuId": "menu_id_123",
    "publishStatus": "revoked",
    "updateTime": "2025-09-16T12:50:17.000Z"
  },
  "timestamp": "2025-09-16T12:50:17.000Z"
}
```

### 菜单状态说明
- `draft`: 草稿
- `published`: 已发布
- `revoked`: 已撤回
- `archived`: 已归档

### 2. 使用后端时间处理工具类
```javascript
const TimeUtils = require('./utils/timeUtils');

// 获取当前北京时间
const beijingTime = TimeUtils.getBeijingTime();

// 将北京时间转换为UTC时间存储
const utcTime = TimeUtils.toUTCForStorage('2024-01-15 18:30:00');

// 将UTC时间转换为北京时间显示
const beijingDisplay = TimeUtils.toBeijingForDisplay('2024-01-15T10:30:00.000Z');

// 检查餐次时间
const mealType = TimeUtils.getMealTypeByTime('2024-01-15 18:30:00');
```

### 3. 使用前端时间处理工具类
```javascript
import { TimeUtils } from './utils/frontendTimeUtils';

// 格式化UTC时间为北京时间显示
const displayTime = TimeUtils.formatTime('2024-01-15T10:30:00.000Z', 'YYYY-MM-DD HH:mm');

// 获取相对时间
const relativeTime = TimeUtils.getRelativeTime('2024-01-15T10:30:00.000Z');

// 将北京时间转换为UTC时间提交
const utcTime = TimeUtils.toUTCForSubmit('2024-01-15 18:30:00');
```

### 4. 运行示例和测试
```bash
# 运行后端时间处理示例
node examples/time-handling-examples.js

# 运行前端时间处理示例
node examples/frontend-time-examples.js

# 运行菜单时间处理修复验证
node scripts/test-menu-time-fix.js

# 运行菜单发布流程完整测试
node scripts/test-menu-publish-flow.js

# 导出数据库结构为JSON格式
npm run export-schema

# 导出数据库摘要
npm run export-summary

# 运行数据库结构使用示例
node examples/database-schema-usage.js
```

## 📊 修复效果

### 修复前
- 用户17:18报餐
- 存储为 `2025-09-11T17:18:00.000Z`（错误）
- 前端显示09:18（错误）

### 修复后
- 用户17:18报餐
- 存储为 `2025-09-11T09:18:00.000Z`（正确）
- 前端显示17:18（正确）

## 🔧 详细使用方法

### 后端时间处理工具类

```javascript
const TimeUtils = require('./utils/timeUtils');

// 获取当前北京时间
const now = TimeUtils.getBeijingTime();

// 转换为UTC时间存储
const utcTime = TimeUtils.toUTCForStorage(now);

// 转换为北京时间显示
const displayTime = TimeUtils.toBeijingForDisplay(utcTime);

// 获取餐次类型
const mealType = TimeUtils.getMealTypeByTime(now);

// 检查是否在就餐时间内
const isInTime = TimeUtils.isInDiningTime(mealType);

// 菜单时间处理示例
// 保存菜单草稿时验证日期
if (req.body.date && TimeUtils.isPastDate(req.body.date)) {
  return ResponseHelper.error(res, '发布日期不能是过去的日期', 400);
}

// 发布菜单时设置时间
const publishTime = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
const effectiveTime = req.body.effectiveTime ? 
  TimeUtils.toUTCForStorage(req.body.effectiveTime) : 
  publishTime;
```

### 前端时间处理工具类

```javascript
import { TimeUtils } from './utils/frontendTimeUtils';

// 格式化UTC时间为北京时间显示
const displayTime = TimeUtils.formatTime('2024-01-15T10:30:00.000Z', 'YYYY-MM-DD HH:mm');

// 获取相对时间
const relativeTime = TimeUtils.getRelativeTime('2024-01-15T10:30:00.000Z');

// 将北京时间转换为UTC时间提交
const utcTime = TimeUtils.toUTCForSubmit('2024-01-15 18:30:00');

// 获取当前日期和时间
const currentDate = TimeUtils.getCurrentDate();
const currentTime = TimeUtils.getCurrentTime();
```

### Vue组件中的使用

```vue
<template>
  <div>
    <p>创建时间: {{ formatTime(item.createTime, 'YYYY-MM-DD HH:mm') }}</p>
    <p>更新时间: {{ getRelativeTime(item.updateTime) }}</p>
  </div>
</template>

<script setup>
import { TimeUtils } from '@/utils/frontendTimeUtils';

const formatTime = (time, format) => TimeUtils.formatTime(time, format);
const getRelativeTime = (time) => TimeUtils.getRelativeTime(time);
</script>
```

### React组件中的使用

```jsx
import React from 'react';
import { useTime } from '@/hooks/useTime';

const TimeDisplay = ({ item }) => {
  const { formatTime, getRelativeTime } = useTime();

  return (
    <div>
      <p>创建时间: {formatTime(item.createTime, 'YYYY-MM-DD HH:mm')}</p>
      <p>更新时间: {getRelativeTime(item.updateTime)}</p>
    </div>
  );
};
```

## ⚠️ 注意事项

1. **统一使用工具类**：禁止直接使用 `new Date()` 或原生时间处理
2. **明确时区处理**：所有时间操作都必须明确指定时区
3. **API格式统一**：接口交互必须使用ISO 8601格式
4. **测试验证**：修改时间处理逻辑后必须运行测试用例

## 🔧 配置要求

### 后端依赖
```json
{
  "moment-timezone": "^0.6.0",
  "mysql2": "^3.6.5"
}
```

### 前端依赖
```json
{
  "dayjs": "^1.11.0"
}
```

### 数据库时区设置
```sql
SET time_zone = '+00:00';
```

## 📝 实施步骤

1. **安装依赖**：
   ```bash
   npm install moment-timezone dayjs
   ```

2. **更新代码**：
   - 使用统一的时间处理工具类
   - 修复现有代码中的时间处理问题
   - 确保API返回正确的UTC时间格式

3. **测试验证**：
   ```bash
   # 运行后端时间处理示例
   node examples/time-handling-examples.js
   
   # 运行前端时间处理示例
   node examples/frontend-time-examples.js
   ```

4. **部署上线**：
   - 在测试环境验证功能
   - 逐步部署到生产环境
   - 监控时间相关功能

## 🎉 总结

通过实施统一时间处理方案，我们实现了：

1. **时间处理一致性**：前后端使用统一的时间处理规范
2. **时区处理准确性**：明确区分UTC存储和北京时间显示
3. **代码可维护性**：通过工具类统一管理时间处理逻辑
4. **开发效率提升**：提供完整的示例和文档
5. **问题预防**：通过规范避免未来出现时间相关问题

## 📞 技术支持

如有问题，请参考以下文档：
- [统一时间处理方案及前端对接文档](./统一时间处理方案及前端对接文档.md)
- [后端时间处理工具类](./utils/timeUtils.js)
- [前端时间处理工具类](./utils/frontendTimeUtils.js)
- [时间处理示例](./examples/)

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件