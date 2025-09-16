# 菜品管理API快速对接指南

## 🚀 快速开始

### 基础信息
- **基础URL**: `http://your-domain.com/api/admin/dishes`
- **认证方式**: Bearer Token
- **数据格式**: JSON

### 请求头设置
```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## 📋 核心接口

### 1. 获取菜品列表（支持餐次筛选）

```http
GET /api/admin/dishes?mealType=breakfast&page=1&pageSize=10
```

**参数说明**:
- `mealType`: 餐次类型 (`breakfast`/`lunch`/`dinner`)
- `page`: 页码 (默认1)
- `pageSize`: 每页数量 (默认20)
- `keyword`: 搜索关键词
- `categoryId`: 分类ID
- `status`: 状态筛选

**响应数据**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "_id": "dish-001",
        "name": "小笼包",
        "price": "8.00",
        "meal_types": ["breakfast"],
        "isRecommended": 1,
        "categoryName": "汤类"
      }
    ],
    "pagination": {
      "page": 1,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### 2. 按餐次类型获取菜品

```http
GET /api/admin/dishes/meal/breakfast?page=1&pageSize=10
```

**路径参数**:
- `breakfast`: 早餐
- `lunch`: 午餐  
- `dinner`: 晚餐

### 3. 创建菜品

```http
POST /api/admin/dishes
```

**请求体**:
```json
{
  "name": "宫保鸡丁",
  "categoryId": "cat-001",
  "description": "经典川菜",
  "price": 25.50,
  "mealTypes": ["lunch", "dinner"],
  "status": "active",
  "isRecommended": true
}
```

**重要字段**:
- `mealTypes`: 餐次类型数组，支持 `["breakfast", "lunch", "dinner"]`
- `price`: 价格（数字）
- `status`: 状态 (`active`/`inactive`)

### 4. 更新菜品

```http
PUT /api/admin/dishes/:dishId
```

**请求体**:
```json
{
  "name": "宫保鸡丁（更新）",
  "mealTypes": ["breakfast", "lunch", "dinner"],
  "price": 28.00
}
```

## 🍽️ 餐次类型说明

| 餐次类型 | 说明 | 使用场景 |
|----------|------|----------|
| `breakfast` | 早餐 | 包子、粥类、豆浆等 |
| `lunch` | 午餐 | 正餐、热菜、汤品等 |
| `dinner` | 晚餐 | 正餐、热菜、汤品等 |

## 💻 前端代码示例

### React/Vue 组件示例

```javascript
// 获取早餐菜品
const getBreakfastDishes = async () => {
  const response = await fetch('/api/admin/dishes/meal/breakfast', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// 创建菜品
const createDish = async (dishData) => {
  const response = await fetch('/api/admin/dishes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dishData)
  });
  return response.json();
};

// 更新菜品餐次类型
const updateDishMealTypes = async (dishId, mealTypes) => {
  const response = await fetch(`/api/admin/dishes/${dishId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ mealTypes })
  });
  return response.json();
};
```

### 餐次类型选择组件

```javascript
// 餐次类型选择器
const MealTypeSelector = ({ value, onChange }) => {
  const mealTypes = [
    { value: 'breakfast', label: '早餐' },
    { value: 'lunch', label: '午餐' },
    { value: 'dinner', label: '晚餐' }
  ];

  return (
    <div>
      {mealTypes.map(type => (
        <label key={type.value}>
          <input
            type="checkbox"
            checked={value.includes(type.value)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...value, type.value]);
              } else {
                onChange(value.filter(t => t !== type.value));
              }
            }}
          />
          {type.label}
        </label>
      ))}
    </div>
  );
};
```

## 🔍 常见使用场景

### 1. 菜品管理页面

```javascript
// 获取所有餐次的菜品
const getAllDishes = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/admin/dishes?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// 按餐次筛选
const filterByMealType = (mealType) => {
  return getAllDishes({ mealType });
};
```

### 2. 菜品创建表单

```javascript
const DishForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    categoryId: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createDish(formData);
    if (result.success) {
      alert('菜品创建成功！');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="菜品名称"
        required
      />
      <input
        type="number"
        value={formData.price}
        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
        placeholder="价格"
        required
      />
      <MealTypeSelector
        value={formData.mealTypes}
        onChange={(mealTypes) => setFormData({...formData, mealTypes})}
      />
      <button type="submit">创建菜品</button>
    </form>
  );
};
```

### 3. 餐次菜品展示

```javascript
const MealDishList = ({ mealType }) => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDishes = async () => {
      setLoading(true);
      const result = await getDishesByMealType(mealType);
      if (result.success) {
        setDishes(result.data.list);
      }
      setLoading(false);
    };
    loadDishes();
  }, [mealType]);

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h3>{mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}</h3>
      {dishes.map(dish => (
        <div key={dish._id}>
          <h4>{dish.name}</h4>
          <p>价格: ¥{dish.price}</p>
          <p>餐次: {dish.meal_types.join(', ')}</p>
        </div>
      ))}
    </div>
  );
};
```

## ⚠️ 注意事项

1. **餐次类型验证**: 确保 `mealTypes` 数组中的值都是有效的
2. **价格格式**: 价格字段为数字类型，不要传字符串
3. **分页处理**: 建议实现分页组件处理大量数据
4. **错误处理**: 实现统一的错误处理机制
5. **权限控制**: 确保只有管理员可以访问这些接口

## 🐛 常见问题

**Q: 为什么返回的菜品没有 `meal_types` 字段？**
A: 确保使用最新的API接口，旧版本可能不支持此字段。

**Q: 如何设置菜品适用于所有餐次？**
A: 在创建或更新时设置 `mealTypes: ["breakfast", "lunch", "dinner"]`

**Q: 如何只获取推荐菜品？**
A: 在查询参数中添加 `isRecommended=true`

**Q: 如何搜索特定餐次的菜品？**
A: 使用 `/api/admin/dishes/meal/{mealType}` 接口或添加 `mealType` 查询参数
