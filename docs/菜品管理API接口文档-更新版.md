# 菜品管理API接口文档 - 更新版

## 概述

本文档描述了菜品管理系统的API接口，包含菜品的增删改查、分类管理、筛选功能等。

**最新更新**：修复了餐次类型筛选功能，现在支持按 `mealType` 和 `isRecommended` 参数进行精确筛选。

## 基础信息

- **基础URL**: `http://localhost:3000/api`
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: Bearer Token（部分接口需要）

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功描述",
  "data": {
    // 具体数据内容
  }
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

## 分页响应格式

```json
{
  "success": true,
  "message": "获取数据成功",
  "data": {
    "list": [
      // 数据列表
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 1. 菜品列表管理

### 1.1 获取菜品列表

**接口地址**: `GET /admin/dishes`

**功能描述**: 获取菜品列表，支持分页、筛选和搜索功能

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | int | 否 | 1 | 页码，从1开始 |
| pageSize | int | 否 | 20 | 每页数量，最大100 |
| keyword | string | 否 | - | 搜索关键词（菜品名称） |
| categoryId | string | 否 | - | 菜品分类ID |
| status | string | 否 | - | 菜品状态：active/inactive |
| mealType | string | 否 | - | 餐次类型：breakfast/lunch/dinner |
| isRecommended | boolean | 否 | - | 是否推荐：true/false |
| minPrice | float | 否 | - | 最低价格 |
| maxPrice | float | 否 | - | 最高价格 |

**请求示例**:
```bash
# 获取所有晚餐菜品
GET /admin/dishes?mealType=dinner&page=1&pageSize=10

# 获取推荐的早餐菜品
GET /admin/dishes?mealType=breakfast&isRecommended=true

# 搜索包含"鸡"的午餐菜品
GET /admin/dishes?keyword=鸡&mealType=lunch

# 价格区间筛选
GET /admin/dishes?minPrice=10&maxPrice=30
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取菜品列表成功",
  "data": {
    "list": [
      {
        "_id": "dish-001",
        "name": "红烧肉",
        "description": "肥瘦相间的红烧肉，入口即化",
        "price": "28.00",
        "categoryId": "category-001",
        "categoryName": "汤类",
        "image": "https://example.com/images/hongshaorou.jpg",
        "tags": ["经典", "下饭"],
        "status": "active",
        "meal_types": ["lunch", "dinner"],
        "isRecommended": 1,
        "calories": 450,
        "protein": "20.00",
        "fat": "35.00",
        "carbohydrate": "12.00",
        "createTime": "2024-01-15T10:30:00Z",
        "updateTime": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 48,
      "totalPages": 3
    }
  }
}
```

### 1.2 按餐次类型获取菜品 (专用接口)

**接口地址**: `GET /admin/dishes/meal/{mealType}`

**功能描述**: 专门用于获取指定餐次类型的菜品列表

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mealType | string | 是 | 餐次类型：breakfast/lunch/dinner |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | int | 否 | 1 | 页码 |
| pageSize | int | 否 | 20 | 每页数量 |
| keyword | string | 否 | - | 搜索关键词 |
| categoryId | string | 否 | - | 分类ID |
| isRecommended | boolean | 否 | - | 是否推荐 |

**请求示例**:
```bash
GET /admin/dishes/meal/dinner?isRecommended=true&page=1&pageSize=5
```

---

## 2. 菜品详情管理

### 2.1 获取菜品详情

**接口地址**: `GET /admin/dishes/{dishId}`

**功能描述**: 获取指定菜品的详细信息

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishId | string | 是 | 菜品唯一标识 |

**响应示例**:
```json
{
  "success": true,
  "message": "获取菜品详情成功",
  "data": {
    "_id": "dish-001",
    "name": "红烧肉",
    "description": "肥瘦相间的红烧肉，入口即化",
    "price": "28.00",
    "categoryId": "category-001",
    "categoryName": "汤类",
    "image": "https://example.com/images/hongshaorou.jpg",
    "tags": ["经典", "下饭"],
    "status": "active",
    "meal_types": ["lunch", "dinner"],
    "isRecommended": 1,
    "calories": 450,
    "protein": "20.00",
    "fat": "35.00",
    "carbohydrate": "12.00",
    "createTime": "2024-01-15T10:30:00Z",
    "updateTime": "2024-01-15T10:30:00Z",
    "createBy": "admin-001",
    "createByName": "系统管理员"
  }
}
```

### 2.2 创建菜品

**接口地址**: `POST /admin/dishes`

**功能描述**: 创建新的菜品

**请求头**: 需要管理员权限
```
Authorization: Bearer {token}
```

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 菜品名称，最大100字符 |
| categoryId | string | 是 | 菜品分类ID |
| description | string | 否 | 菜品描述，最大500字符 |
| price | float | 是 | 价格，必须≥0 |
| image | string | 否 | 图片URL |
| calories | float | 否 | 卡路里，必须≥0 |
| protein | float | 否 | 蛋白质含量，必须≥0 |
| fat | float | 否 | 脂肪含量，必须≥0 |
| carbohydrate | float | 否 | 碳水化合物含量，必须≥0 |
| tags | array | 否 | 标签数组 |
| status | string | 否 | 状态：active/inactive，默认active |
| isRecommended | boolean | 否 | 是否推荐，默认false |
| mealTypes | array | 否 | 餐次类型数组，默认["breakfast","lunch","dinner"] |

**请求示例**:
```json
{
  "name": "麻婆豆腐",
  "categoryId": "category-002",
  "description": "经典川菜，麻辣鲜香",
  "price": 18.50,
  "image": "https://example.com/images/mapodoufu.jpg",
  "tags": ["川菜", "素食", "下饭"],
  "status": "active",
  "isRecommended": true,
  "mealTypes": ["lunch", "dinner"],
  "calories": 280,
  "protein": 12.5,
  "fat": 15.2,
  "carbohydrate": 20.8
}
```

### 2.3 更新菜品

**接口地址**: `PUT /admin/dishes/{dishId}`

**功能描述**: 更新指定菜品的信息

**请求头**: 需要管理员权限
```
Authorization: Bearer {token}
```

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishId | string | 是 | 菜品唯一标识 |

**请求参数**: 与创建菜品相同，但所有字段都为可选

**请求示例**:
```json
{
  "name": "改良版麻婆豆腐",
  "price": 19.50,
  "isRecommended": false,
  "mealTypes": ["lunch"]
}
```

### 2.4 更新菜品状态

**接口地址**: `PUT /admin/dishes/{dishId}/status`

**功能描述**: 更新菜品的启用/禁用状态

**请求头**: 需要管理员权限

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 是 | 状态：active/inactive |

### 2.5 删除菜品

**接口地址**: `DELETE /admin/dishes/{dishId}`

**功能描述**: 删除指定菜品（软删除）

**请求头**: 需要管理员权限

### 2.6 批量删除菜品

**接口地址**: `POST /admin/dishes/batch-delete`

**功能描述**: 批量删除多个菜品

**请求头**: 需要管理员权限

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishIds | array | 是 | 菜品ID数组，至少包含1个 |

**请求示例**:
```json
{
  "dishIds": ["dish-001", "dish-002", "dish-003"]
}
```

---

## 3. 菜品分类管理

### 3.1 获取菜品分类列表

**接口地址**: `GET /admin/dishes/categories`

**功能描述**: 获取所有菜品分类

**响应示例**:
```json
{
  "success": true,
  "message": "获取菜品分类成功",
  "data": [
    {
      "_id": "category-001",
      "name": "汤类",
      "description": "各种汤品",
      "icon": "🍲",
      "sort": 1,
      "status": "active",
      "createTime": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 3.2 创建菜品分类

**接口地址**: `POST /admin/dishes/categories`

**功能描述**: 创建新的菜品分类

**请求头**: 需要管理员权限

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 分类名称，最大50字符 |
| description | string | 否 | 分类描述，最大200字符 |
| icon | string | 否 | 图标，最大10字符 |
| sort | int | 否 | 排序值，默认0 |
| status | string | 否 | 状态，默认active |

---

## 4. 菜单管理

### 4.1 获取菜单的菜品列表

**接口地址**: `GET /admin/menu/{menuId}/dishes`

**功能描述**: 获取指定菜单包含的菜品列表

### 4.2 设置菜单菜品

**接口地址**: `POST /admin/menu/{menuId}/dishes`

**功能描述**: 设置菜单包含的菜品

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishItems | array | 是 | 菜品项目数组 |
| dishItems[].dishId | string | 是 | 菜品ID |
| dishItems[].price | float | 否 | 菜单中的价格 |
| dishItems[].sort | int | 否 | 在菜单中的排序 |

---

## 5. 特色功能

### 5.1 营养模板

**接口地址**: `GET /admin/dishes/nutrition-templates`

**功能描述**: 获取营养信息模板，用于快速填充菜品营养数据

### 5.2 图片上传

**接口地址**: `POST /admin/dishes/upload-image`

**功能描述**: 上传菜品图片

**请求格式**: multipart/form-data

### 5.3 可用菜品列表

**接口地址**: `GET /admin/dishes/available`

**功能描述**: 获取可用于菜单选择的菜品列表

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| categoryId | string | 否 | - | 分类筛选 |
| keyword | string | 否 | - | 关键词搜索 |
| status | string | 否 | active | 状态筛选 |
| pageSize | int | 否 | 100 | 返回数量 |

---

## 6. 数据模型

### 6.1 菜品数据模型

```typescript
interface Dish {
  _id: string;                    // 菜品唯一标识
  name: string;                   // 菜品名称
  description?: string;           // 菜品描述
  price: string;                  // 价格（字符串格式）
  categoryId: string;             // 分类ID
  categoryName?: string;          // 分类名称（查询时返回）
  image?: string;                 // 图片URL
  tags: string[];                 // 标签数组
  status: 'active' | 'inactive' | 'deleted'; // 状态
  meal_types: ('breakfast' | 'lunch' | 'dinner')[]; // 餐次类型数组
  isRecommended: 0 | 1;          // 是否推荐（数字格式）
  calories?: number;              // 卡路里
  protein?: string;               // 蛋白质含量
  fat?: string;                   // 脂肪含量
  carbohydrate?: string;          // 碳水化合物含量
  createTime: string;             // 创建时间
  updateTime: string;             // 更新时间
  createBy?: string;              // 创建者ID
  createByName?: string;          // 创建者名称
}
```

### 6.2 分类数据模型

```typescript
interface DishCategory {
  _id: string;                    // 分类唯一标识
  name: string;                   // 分类名称
  description?: string;           // 分类描述
  icon?: string;                  // 分类图标
  sort: number;                   // 排序值
  status: 'active' | 'inactive' | 'deleted'; // 状态
  createTime: string;             // 创建时间
  updateTime: string;             // 更新时间
  createBy?: string;              // 创建者ID
}
```

---

## 7. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或token过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 8. 筛选功能使用指南

### 8.1 餐次类型筛选

餐次类型筛选是本次重点修复的功能，现在支持精确筛选：

**支持的餐次类型**:
- `breakfast`: 早餐
- `lunch`: 午餐  
- `dinner`: 晚餐

**使用示例**:
```bash
# 获取所有晚餐菜品
GET /admin/dishes?mealType=dinner

# 获取早餐菜品的第2页
GET /admin/dishes?mealType=breakfast&page=2&pageSize=10

# 获取推荐的午餐菜品
GET /admin/dishes?mealType=lunch&isRecommended=true
```

### 8.2 组合筛选

支持多个条件组合筛选：

```bash
# 搜索包含"鸡"字的晚餐菜品，价格在10-30元之间
GET /admin/dishes?keyword=鸡&mealType=dinner&minPrice=10&maxPrice=30

# 获取特定分类的推荐早餐菜品
GET /admin/dishes?categoryId=category-001&mealType=breakfast&isRecommended=true
```

### 8.3 数据库存储格式

菜品的 `meal_types` 字段在数据库中以JSON数组格式存储：
```json
["breakfast", "lunch"]  // 早餐和午餐
["dinner"]              // 仅晚餐
["breakfast", "lunch", "dinner"] // 全天供应
```

---

## 9. 更新日志

### v2.0.0 (2024-01-16)
- ✅ **修复餐次类型筛选功能**: 现在 `mealType` 参数可以正确筛选菜品
- ✅ **新增推荐状态筛选**: 支持 `isRecommended` 参数筛选推荐菜品
- ✅ **优化路由处理**: 修复了路由冲突导致的筛选失效问题
- ✅ **改进数据格式**: 确保 `meal_types` 字段以正确的JSON格式存储
- ✅ **增强错误处理**: 改进了参数验证和错误提示

### v1.0.0 (2024-01-15)
- 基础菜品管理功能
- 分类管理功能
- 图片上传功能

---

## 10. 技术说明

### 10.1 路由架构

系统使用了两套路由来处理菜品相关请求：

1. **管理员路由** (`/admin/dishes`): 通过 `dishRoutes` 处理，调用 `dishService.getDishList`
2. **通用路由** (`/admin/**`): 通过 `adminRoutes` 处理，调用 `adminService.getDishes`

由于路由注册顺序，实际的 `/admin/dishes` 请求会被第一套路由拦截处理。

### 10.2 数据库查询

筛选功能使用MySQL的JSON函数进行查询：

```sql
-- 按餐次类型筛选
WHERE JSON_CONTAINS(d.meal_types, JSON_QUOTE('dinner'))

-- 按推荐状态筛选  
WHERE d.isRecommended = 1
```

### 10.3 参数处理

- `mealType`: 直接字符串匹配
- `isRecommended`: 字符串 "true"/"false" 转换为布尔值，再转换为数字 1/0
- `page`/`pageSize`: 字符串转换为整数，并设置合理默认值和上限

---

## 联系信息

如有问题或建议，请联系开发团队。

**API版本**: v2.0.0  
**文档更新日期**: 2024-01-16  
**维护状态**: 活跃维护中
