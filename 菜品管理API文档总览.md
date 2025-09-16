# 菜品管理API文档总览

## 📚 文档索引

本文档集合包含了菜品管理功能完善后的完整API接口文档，用于前端开发人员对接。

### 📋 文档列表

1. **[菜品管理API接口文档.md](./菜品管理API接口文档.md)** - 完整详细的API接口文档
   - 包含所有接口的详细说明
   - 完整的请求/响应示例
   - 错误处理说明
   - 前端集成示例

2. **[菜品管理API快速对接指南.md](./菜品管理API快速对接指南.md)** - 快速对接指南
   - 核心接口快速参考
   - 常用代码示例
   - 前端组件示例
   - 常见问题解答

3. **[菜品管理功能完善说明.md](./菜品管理功能完善说明.md)** - 功能完善说明
   - 技术实现细节
   - 数据库设计说明
   - 部署指南
   - 测试验证结果

## 🚀 快速开始

### 1. 基础信息
- **基础URL**: `http://your-domain.com/api/admin/dishes`
- **认证方式**: Bearer Token
- **数据格式**: JSON

### 2. 核心功能
- ✅ 菜品增删改查
- ✅ 按餐次类型管理菜品
- ✅ 餐次类型筛选和查询
- ✅ 菜品分类管理
- ✅ 营养信息管理

### 3. 餐次类型支持
| 餐次类型 | 英文标识 | 中文名称 | 使用场景 |
|----------|----------|----------|----------|
| breakfast | breakfast | 早餐 | 包子、粥类、豆浆等 |
| lunch | lunch | 午餐 | 正餐、热菜、汤品等 |
| dinner | dinner | 晚餐 | 正餐、热菜、汤品等 |

## 📋 核心接口速览

### 获取菜品列表
```http
GET /api/admin/dishes?mealType=breakfast&page=1&pageSize=10
```

### 按餐次类型获取菜品
```http
GET /api/admin/dishes/meal/breakfast?page=1&pageSize=10
```

### 创建菜品
```http
POST /api/admin/dishes
Content-Type: application/json

{
  "name": "宫保鸡丁",
  "categoryId": "cat-001",
  "price": 25.50,
  "mealTypes": ["lunch", "dinner"],
  "status": "active"
}
```

### 更新菜品
```http
PUT /api/admin/dishes/:dishId
Content-Type: application/json

{
  "mealTypes": ["breakfast", "lunch", "dinner"],
  "price": 28.00
}
```

## 💻 前端集成示例

### 基础请求设置
```javascript
const API_BASE = 'http://your-domain.com/api/admin/dishes';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### 获取早餐菜品
```javascript
const getBreakfastDishes = async () => {
  const response = await fetch(`${API_BASE}/meal/breakfast`, { headers });
  return response.json();
};
```

### 创建菜品
```javascript
const createDish = async (dishData) => {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(dishData)
  });
  return response.json();
};
```

### 更新菜品餐次类型
```javascript
const updateDishMealTypes = async (dishId, mealTypes) => {
  const response = await fetch(`${API_BASE}/${dishId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ mealTypes })
  });
  return response.json();
};
```

## 🧪 测试工具

### API测试工具
```bash
# 运行API演示工具
node scripts/api_demo_tool.js

# 运行API测试工具（需要认证）
node scripts/api_test_tool.js
```

### 数据库测试
```bash
# 测试数据库功能
node scripts/test_meal_type_direct.js

# 创建测试数据
node scripts/create_test_dishes.js
```

## 📊 数据格式说明

### 菜品数据格式
```json
{
  "_id": "dish-001",
  "name": "小笼包",
  "description": "经典上海小笼包，皮薄馅大",
  "price": "8.00",
  "categoryId": "cat-001",
  "categoryName": "汤类",
  "meal_types": ["breakfast"],
  "status": "active",
  "isRecommended": 1,
  "calories": 200,
  "protein": "8.50",
  "fat": "5.20",
  "carbohydrate": "25.00",
  "tags": ["经典", "上海"],
  "createTime": "2025-09-16T01:04:11.000Z",
  "updateTime": "2025-09-16T01:04:11.000Z"
}
```

### 分页数据格式
```json
{
  "success": true,
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

## ⚠️ 注意事项

### 1. 认证要求
- 所有接口都需要有效的管理员Token
- Token需要在请求头中携带：`Authorization: Bearer {token}`

### 2. 参数验证
- 餐次类型必须是有效的值：`breakfast`、`lunch`、`dinner`
- 价格字段为数字类型，不要传字符串
- 分页参数有范围限制：page >= 1, pageSize 1-100

### 3. 错误处理
- 实现统一的错误处理机制
- 根据HTTP状态码和响应消息处理不同错误
- 提供用户友好的错误提示

### 4. 性能优化
- 使用分页避免一次性加载大量数据
- 考虑实现菜品列表缓存
- 合理使用筛选参数减少不必要的数据传输

## 🔧 开发建议

### 1. 前端组件设计
- 实现餐次类型选择器组件
- 设计菜品列表展示组件
- 创建菜品表单组件

### 2. 状态管理
- 使用适当的状态管理方案（Redux、Vuex等）
- 缓存菜品数据减少重复请求
- 实现乐观更新提升用户体验

### 3. 用户体验
- 提供加载状态指示
- 实现错误状态提示
- 添加操作确认对话框

### 4. 测试策略
- 编写单元测试覆盖核心功能
- 实现集成测试验证API调用
- 进行端到端测试确保完整流程

## 📞 技术支持

如果在对接过程中遇到问题，请参考：

1. **详细文档**: 查看 `菜品管理API接口文档.md`
2. **快速参考**: 查看 `菜品管理API快速对接指南.md`
3. **技术细节**: 查看 `菜品管理功能完善说明.md`
4. **测试工具**: 运行 `scripts/api_demo_tool.js`

## 📝 更新日志

- **v1.1.0** (2025-09-16): 菜品管理功能完善
  - 新增餐次类型管理功能
  - 添加 `meal_types` 字段支持
  - 新增按餐次类型查询接口
  - 增强创建和更新菜品接口
  - 优化查询性能和用户体验

---

**最后更新**: 2025-09-16  
**文档版本**: v1.1.0  
**API版本**: v1.1.0
