# 前端API接口清单 - 确认就餐功能

## 📋 快速参考

### 基础配置
```javascript
const API_BASE = '/api/dining-confirmation';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## 🔐 用户端接口

### 1. 获取就餐确认状态
```javascript
GET /api/dining-confirmation/status?date=2024-01-15

// 响应示例
{
  "success": true,
  "data": {
    "mealConfirmationStatus": {
      "breakfast": {
        "isRegistered": true,
        "diningStatus": "dined",        // ordered/dined/cancelled
        "confirmationText": "已就餐",
        "actualDiningTime": "2024-01-15 08:30:00"
      }
    },
    "summary": {
      "totalRegistered": 2,
      "totalConfirmed": 1,
      "pendingConfirmation": 1
    }
  }
}
```

### 2. 手动确认就餐
```javascript
POST /api/dining-confirmation/manual/:orderId
Body: { "confirmationType": "manual" }

// 响应示例
{
  "success": true,
  "data": {
    "orderId": "order_id_1",
    "actualDiningTime": "2024-01-15 12:30:00"
  }
}
```

### 3. 获取确认历史
```javascript
GET /api/dining-confirmation/history?page=1&pageSize=20

// 响应示例
{
  "success": true,
  "data": {
    "records": [
      {
        "mealTypeName": "早餐",
        "confirmationText": "已就餐",
        "actualDiningTime": "2024-01-15 08:30:00"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

## 👨‍💼 管理员端接口

### 4. 管理员代确认
```javascript
POST /api/dining-confirmation/admin/:orderId
Body: { "remark": "管理员代确认" }

// 响应示例
{
  "success": true,
  "data": {
    "confirmationType": "admin",
    "confirmedBy": "admin_id"
  }
}
```

### 5. 批量确认
```javascript
POST /api/dining-confirmation/batch
Body: {
  "orderIds": ["order_id_1", "order_id_2"],
  "remark": "批量确认"
}

// 响应示例
{
  "success": true,
  "data": {
    "successCount": 2,
    "totalCount": 2,
    "errors": []
  }
}
```

### 6. 待确认列表
```javascript
GET /api/dining-confirmation/pending?page=1&pageSize=20

// 响应示例
{
  "success": true,
  "data": {
    "records": [
      {
        "userName": "张三",
        "deptName": "技术部",
        "mealTypeName": "午餐",
        "diningDate": "2024-01-15"
      }
    ],
    "total": 1
  }
}
```

### 7. 统计信息
```javascript
GET /api/dining-confirmation/stats?date=2024-01-15

// 响应示例
{
  "success": true,
  "data": {
    "totalStats": {
      "totalOrders": 156,
      "pendingConfirmation": 45,
      "confirmedDining": 98
    },
    "mealStats": [
      {
        "mealTypeName": "早餐",
        "totalOrders": 45,
        "confirmedDining": 30
      }
    ]
  }
}
```

## 🎨 前端组件建议

### 状态显示组件
```vue
<template>
  <div class="meal-status">
    <div v-for="meal in meals" :key="meal.type" class="meal-card">
      <h3>{{ meal.name }}</h3>
      <span class="status">{{ meal.confirmationText }}</span>
      <button 
        v-if="meal.diningStatus === 'ordered'"
        @click="confirmDining(meal.orderId)"
      >
        确认就餐
      </button>
    </div>
  </div>
</template>
```

### 批量操作组件
```vue
<template>
  <div class="batch-actions">
    <el-checkbox 
      v-model="selectAll" 
      @change="handleSelectAll"
    >
      全选
    </el-checkbox>
    <el-button 
      @click="batchConfirm"
      :disabled="selectedOrders.length === 0"
    >
      批量确认 ({{ selectedOrders.length }})
    </el-button>
  </div>
</template>
```

## 🚨 错误处理

### 常见错误
- `400`: 请求参数错误
- `401`: 未授权，需要重新登录
- `403`: 权限不足
- `409`: 业务冲突（如重复确认）

### 错误处理示例
```javascript
try {
  const response = await fetch('/api/dining-confirmation/status');
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  return result.data;
} catch (error) {
  if (error.message.includes('未授权')) {
    // 跳转到登录页
    router.push('/login');
  } else {
    // 显示错误提示
    showError(error.message);
  }
}
```

## 📱 移动端适配

### 响应式样式
```css
@media (max-width: 768px) {
  .meal-card {
    padding: 15px;
    margin-bottom: 10px;
  }
  
  .confirm-btn {
    width: 100%;
    padding: 12px;
  }
}
```

### 触摸优化
```javascript
// 防重复点击
let isProcessing = false;

async function handleConfirm() {
  if (isProcessing) return;
  
  isProcessing = true;
  try {
    await confirmDining();
  } finally {
    isProcessing = false;
  }
}
```

## 🔄 状态管理

### Vuex 示例
```javascript
// store
const state = {
  diningStatus: null,
  pendingOrders: []
};

const mutations = {
  SET_DINING_STATUS(state, status) {
    state.diningStatus = status;
  }
};

const actions = {
  async fetchDiningStatus({ commit }) {
    const response = await api.getDiningStatus();
    commit('SET_DINING_STATUS', response.data);
  }
};
```

## 📋 开发检查清单

### 功能实现
- [ ] 获取就餐状态接口调用
- [ ] 确认就餐按钮功能
- [ ] 状态显示和更新
- [ ] 错误处理和提示
- [ ] 加载状态显示

### 用户体验
- [ ] 移动端适配
- [ ] 触摸操作优化
- [ ] 防重复点击
- [ ] 操作反馈提示
- [ ] 页面加载优化

### 管理员功能
- [ ] 待确认列表显示
- [ ] 批量选择功能
- [ ] 批量确认操作
- [ ] 统计信息展示
- [ ] 权限控制

---

**快速开始**: 参考 `前端对接-确认就餐接口文档.md` 获取详细实现说明
