# 菜品管理API接口文档

## 📋 接口概述

菜品管理API提供菜品的增删改查、分类管理、营养模板等功能，支持早中晚餐菜品的区分管理。

**基础路径**: `/api/admin/dishes`

**认证要求**: 所有接口都需要有效的JWT Token和管理员权限

**Content-Type**: `application/json`

## 🔐 认证说明

所有接口都需要在请求头中携带管理员Token：

```http
Authorization: Bearer {your_admin_token}
```

## 📚 接口列表

### 1. 获取菜品列表

**接口地址**: `GET /api/admin/dishes`

**接口描述**: 获取菜品列表，支持分页、筛选和按餐次类型查询

**请求头**:
```http
Authorization: Bearer {token}
```

**查询参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码，必须大于0 |
| pageSize | number | 否 | 20 | 每页数量，1-100之间 |
| keyword | string | 否 | - | 关键词搜索（菜品名称/描述） |
| categoryId | string | 否 | - | 分类ID筛选 |
| status | string | 否 | - | 状态筛选：active/inactive |
| mealType | string | 否 | - | 餐次类型筛选：breakfast/lunch/dinner |

**请求示例**:
```http
GET /api/admin/dishes?page=1&pageSize=10&mealType=breakfast&keyword=包子
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
        "name": "小笼包",
        "description": "经典上海小笼包，皮薄馅大",
        "price": "8.00",
        "categoryId": "cat-001",
        "categoryName": "汤类",
        "image": "https://example.com/xiaolongbao.jpg",
        "calories": 200,
        "protein": "8.50",
        "fat": "5.20",
        "carbohydrate": "25.00",
        "tags": ["经典", "上海"],
        "status": "active",
        "isRecommended": 1,
        "meal_types": ["breakfast"],
        "createTime": "2025-09-16T01:04:11.000Z",
        "updateTime": "2025-09-16T01:04:11.000Z",
        "createBy": "admin-001"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### 2. 按餐次类型获取菜品列表

**接口地址**: `GET /api/admin/dishes/meal/:mealType`

**接口描述**: 专门按餐次类型获取菜品列表，支持多种筛选条件

**请求头**:
```http
Authorization: Bearer {token}
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mealType | string | 是 | 餐次类型：breakfast/lunch/dinner |

**查询参数**:
| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码，必须大于0 |
| pageSize | number | 否 | 20 | 每页数量，1-100之间 |
| keyword | string | 否 | - | 关键词搜索（菜品名称/描述） |
| categoryId | string | 否 | - | 分类ID筛选 |
| isRecommended | boolean | 否 | - | 是否推荐筛选 |

**请求示例**:
```http
GET /api/admin/dishes/meal/breakfast?page=1&pageSize=10&isRecommended=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取早餐菜品列表成功",
  "data": {
    "list": [
      {
        "_id": "dish-001",
        "name": "小笼包",
        "description": "经典上海小笼包，皮薄馅大",
        "price": "8.00",
        "categoryId": "cat-001",
        "categoryName": "汤类",
        "image": "https://example.com/xiaolongbao.jpg",
        "calories": 200,
        "protein": "8.50",
        "fat": "5.20",
        "carbohydrate": "25.00",
        "tags": ["经典", "上海"],
        "status": "active",
        "isRecommended": 1,
        "meal_types": ["breakfast"],
        "createTime": "2025-09-16T01:04:11.000Z",
        "updateTime": "2025-09-16T01:04:11.000Z",
        "createBy": "admin-001"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "mealType": "breakfast"
  }
}
```

---

### 3. 创建菜品

**接口地址**: `POST /api/admin/dishes`

**接口描述**: 创建新菜品，支持设置餐次类型

**请求头**:
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 菜品名称，最大100字符 |
| categoryId | string | 是 | 分类ID |
| description | string | 否 | 菜品描述，最大500字符 |
| price | number | 是 | 价格，必须大于等于0 |
| image | string | 否 | 图片URL |
| calories | number | 否 | 卡路里，必须大于等于0 |
| protein | number | 否 | 蛋白质(g)，必须大于等于0 |
| fat | number | 否 | 脂肪(g)，必须大于等于0 |
| carbohydrate | number | 否 | 碳水化合物(g)，必须大于等于0 |
| tags | array | 否 | 标签数组 |
| status | string | 否 | 状态：active/inactive，默认active |
| isRecommended | boolean | 否 | 是否推荐，默认false |
| **mealTypes** | **array** | **否** | **餐次类型数组，默认["breakfast","lunch","dinner"]** |

**餐次类型说明**:
- `breakfast`: 早餐
- `lunch`: 午餐  
- `dinner`: 晚餐

**请求示例**:
```json
{
  "name": "宫保鸡丁",
  "categoryId": "cat-001",
  "description": "经典川菜，麻辣鲜香",
  "price": 25.50,
  "image": "https://example.com/gongbaojiding.jpg",
  "calories": 350,
  "protein": 25.5,
  "fat": 15.2,
  "carbohydrate": 18.7,
  "tags": ["川菜", "麻辣", "经典"],
  "status": "active",
  "isRecommended": true,
  "mealTypes": ["lunch", "dinner"]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "创建菜品成功",
  "data": {
    "id": "dish-002",
    "name": "宫保鸡丁",
    "price": 25.50,
    "status": "active",
    "mealTypes": ["lunch", "dinner"]
  }
}
```

---

### 4. 更新菜品

**接口地址**: `PUT /api/admin/dishes/:dishId`

**接口描述**: 更新菜品信息，支持更新餐次类型

**请求头**:
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishId | string | 是 | 菜品ID |

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 否 | 菜品名称，最大100字符 |
| categoryId | string | 否 | 分类ID |
| description | string | 否 | 菜品描述，最大500字符 |
| price | number | 否 | 价格，必须大于等于0 |
| image | string | 否 | 图片URL |
| calories | number | 否 | 卡路里，必须大于等于0 |
| protein | number | 否 | 蛋白质(g)，必须大于等于0 |
| fat | number | 否 | 脂肪(g)，必须大于等于0 |
| carbohydrate | number | 否 | 碳水化合物(g)，必须大于等于0 |
| tags | array | 否 | 标签数组 |
| status | string | 否 | 状态：active/inactive |
| isRecommended | boolean | 否 | 是否推荐 |
| **mealTypes** | **array** | **否** | **餐次类型数组** |

**请求示例**:
```json
{
  "name": "宫保鸡丁（更新）",
  "price": 28.00,
  "mealTypes": ["breakfast", "lunch", "dinner"],
  "isRecommended": false
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "更新菜品成功",
  "data": {
    "id": "dish-002",
    "name": "宫保鸡丁（更新）",
    "price": 28.00,
    "mealTypes": ["breakfast", "lunch", "dinner"],
    "isRecommended": false
  }
}
```

---

### 5. 获取菜品详情

**接口地址**: `GET /api/admin/dishes/:dishId`

**接口描述**: 获取指定菜品的详细信息

**请求头**:
```http
Authorization: Bearer {token}
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishId | string | 是 | 菜品ID |

**请求示例**:
```http
GET /api/admin/dishes/dish-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取菜品详情成功",
  "data": {
    "_id": "dish-001",
    "name": "小笼包",
    "description": "经典上海小笼包，皮薄馅大",
    "price": "8.00",
    "categoryId": "cat-001",
    "categoryName": "汤类",
    "image": "https://example.com/xiaolongbao.jpg",
    "calories": 200,
    "protein": "8.50",
    "fat": "5.20",
    "carbohydrate": "25.00",
    "tags": ["经典", "上海"],
    "status": "active",
    "isRecommended": 1,
    "meal_types": ["breakfast"],
    "createTime": "2025-09-16T01:04:11.000Z",
    "updateTime": "2025-09-16T01:04:11.000Z",
    "createBy": "admin-001"
  }
}
```

---

### 6. 更新菜品状态

**接口地址**: `PUT /api/admin/dishes/:dishId/status`

**接口描述**: 更新菜品状态（启用/停用）

**请求头**:
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishId | string | 是 | 菜品ID |

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 是 | 状态：active/inactive |

**请求示例**:
```json
{
  "status": "inactive"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "更新菜品状态成功",
  "data": null
}
```

---

### 7. 删除菜品

**接口地址**: `DELETE /api/admin/dishes/:dishId`

**接口描述**: 删除菜品（软删除）

**请求头**:
```http
Authorization: Bearer {token}
```

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishId | string | 是 | 菜品ID |

**请求示例**:
```http
DELETE /api/admin/dishes/dish-001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "删除菜品成功",
  "data": null
}
```

---

### 8. 批量删除菜品

**接口地址**: `POST /api/admin/dishes/batch-delete`

**接口描述**: 批量删除菜品

**请求头**:
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dishIds | array | 是 | 菜品ID数组 |

**请求示例**:
```json
{
  "dishIds": ["dish-001", "dish-002", "dish-003"]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "批量删除菜品成功",
  "data": null
}
```

---

## 🍽️ 餐次类型管理

### 餐次类型说明

| 餐次类型 | 英文标识 | 中文名称 | 说明 |
|----------|----------|----------|------|
| breakfast | breakfast | 早餐 | 适用于早餐时段 |
| lunch | lunch | 午餐 | 适用于午餐时段 |
| dinner | dinner | 晚餐 | 适用于晚餐时段 |

### 餐次类型使用场景

1. **单一餐次**: 菜品只适用于特定餐次
   ```json
   {
     "mealTypes": ["breakfast"]
   }
   ```

2. **多餐次**: 菜品适用于多个餐次
   ```json
   {
     "mealTypes": ["lunch", "dinner"]
   }
   ```

3. **全餐次**: 菜品适用于所有餐次
   ```json
   {
     "mealTypes": ["breakfast", "lunch", "dinner"]
   }
   ```

## 📊 前端集成示例

### 1. 获取早餐菜品列表

```javascript
// 获取早餐菜品
async function getBreakfastDishes() {
  try {
    const response = await fetch('/api/admin/dishes/meal/breakfast?page=1&pageSize=10', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('早餐菜品:', data.data.list);
      return data.data.list;
    }
  } catch (error) {
    console.error('获取早餐菜品失败:', error);
  }
}
```

### 2. 创建带餐次类型的菜品

```javascript
// 创建只适用于午餐的菜品
async function createLunchDish() {
  const dishData = {
    name: "红烧肉",
    categoryId: "cat-001",
    description: "肥瘦相间的红烧肉",
    price: 28.00,
    mealTypes: ["lunch"], // 只适用于午餐
    status: "active",
    isRecommended: true
  };
  
  try {
    const response = await fetch('/api/admin/dishes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dishData)
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('菜品创建成功:', data.data);
    }
  } catch (error) {
    console.error('创建菜品失败:', error);
  }
}
```

### 3. 按餐次类型筛选菜品

```javascript
// 在所有菜品中筛选早餐菜品
async function filterBreakfastDishes() {
  try {
    const response = await fetch('/api/admin/dishes?mealType=breakfast&page=1&pageSize=20', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('早餐菜品筛选结果:', data.data.list);
      return data.data.list;
    }
  } catch (error) {
    console.error('筛选菜品失败:', error);
  }
}
```

### 4. 更新菜品餐次类型

```javascript
// 将菜品更新为适用于所有餐次
async function updateDishMealTypes(dishId) {
  const updateData = {
    mealTypes: ["breakfast", "lunch", "dinner"]
  };
  
  try {
    const response = await fetch(`/api/admin/dishes/${dishId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('菜品餐次类型更新成功:', data.data);
    }
  } catch (error) {
    console.error('更新菜品失败:', error);
  }
}
```

## ⚠️ 错误处理

### 常见错误码

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | 参数验证失败 | 请求参数格式不正确 |
| 401 | 缺少访问令牌 | 未提供有效的认证Token |
| 403 | 权限不足 | 当前用户无权限访问 |
| 404 | 菜品不存在 | 指定的菜品ID不存在 |
| 500 | 服务器内部错误 | 服务器处理请求时发生错误 |

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

## 🔧 开发建议

1. **餐次类型验证**: 前端应验证餐次类型数组的有效性
2. **分页处理**: 建议实现分页组件处理大量数据
3. **错误处理**: 实现统一的错误处理机制
4. **缓存策略**: 考虑对菜品列表进行适当缓存
5. **用户体验**: 提供餐次类型的可视化选择界面

## 📝 更新日志

- **v1.1.0** (2025-09-16): 新增餐次类型管理功能
  - 添加 `meal_types` 字段支持
  - 新增按餐次类型查询接口
  - 增强创建和更新菜品接口
  - 优化查询性能和用户体验
