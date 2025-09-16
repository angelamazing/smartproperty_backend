# 前端对接 - 手动确认就餐API清单

## 🚀 快速开始

### 基础配置
```javascript
const API_BASE = '/api/dining-confirmation';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## 📋 核心接口

### 1. 手动确认就餐

**接口**: `POST /api/dining-confirmation/manual/:orderId`

**参数**:
- `orderId`: 订单ID（路径参数）
- `confirmationType`: "manual"（可选，默认值）

**请求示例**:
```javascript
const response = await fetch(`${API_BASE}/manual/${orderId}`, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    confirmationType: 'manual'
  })
});

const result = await response.json();
```

**成功响应**:
```json
{
  "success": true,
  "message": "确认就餐成功",
  "data": {
    "orderId": "917a80ca-bc11-4458-a72f-04122a4b37a7",
    "confirmationType": "manual",
    "actualDiningTime": "2025-09-11 12:30:00",
    "message": "确认就餐成功"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "订单不存在或无权操作",
  "error": "Not Found"
}
```

## 🔧 前端实现示例

### 1. 原生JavaScript

```javascript
class DiningConfirmationAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async confirmDining(orderId) {
    try {
      const response = await fetch(`${this.baseURL}/api/dining-confirmation/manual/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmationType: 'manual'
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '确认就餐失败');
      }

      return result.data;
    } catch (error) {
      console.error('确认就餐失败:', error);
      throw error;
    }
  }
}

// 使用示例
const api = new DiningConfirmationAPI('http://localhost:3000', 'your-jwt-token');
api.confirmDining('917a80ca-bc11-4458-a72f-04122a4b37a7')
  .then(result => console.log('确认成功:', result))
  .catch(error => console.error('确认失败:', error.message));
```

### 2. Axios版本

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器，自动添加token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 确认就餐方法
export const confirmDiningManually = async (orderId) => {
  try {
    const response = await api.post(`/api/dining-confirmation/manual/${orderId}`, {
      confirmationType: 'manual'
    });
    
    return response.data.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    throw new Error(message);
  }
};
```

### 3. React Hook

```javascript
import { useState } from 'react';
import { confirmDiningManually } from './api';

export const useDiningConfirmation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const confirmDining = async (orderId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await confirmDiningManually(orderId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { confirmDining, loading, error };
};

// 组件中使用
function ConfirmDiningButton({ orderId, onSuccess }) {
  const { confirmDining, loading, error } = useDiningConfirmation();

  const handleConfirm = async () => {
    try {
      const result = await confirmDining(orderId);
      onSuccess(result);
    } catch (err) {
      // 错误已在hook中处理
    }
  };

  return (
    <div>
      <button onClick={handleConfirm} disabled={loading}>
        {loading ? '确认中...' : '确认就餐'}
      </button>
      {error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  );
}
```

### 4. Vue.js Composition API

```javascript
import { ref } from 'vue';
import { confirmDiningManually } from './api';

export function useDiningConfirmation() {
  const loading = ref(false);
  const error = ref(null);

  const confirmDining = async (orderId) => {
    loading.value = true;
    error.value = null;
    
    try {
      const result = await confirmDiningManually(orderId);
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { confirmDining, loading, error };
}

// 组件中使用
<template>
  <div>
    <button @click="handleConfirm" :disabled="loading">
      {{ loading ? '确认中...' : '确认就餐' }}
    </button>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { useDiningConfirmation } from '@/composables/useDiningConfirmation';

const props = defineProps(['orderId']);
const emit = defineEmits(['success']);

const { confirmDining, loading, error } = useDiningConfirmation();

const handleConfirm = async () => {
  try {
    const result = await confirmDining(props.orderId);
    emit('success', result);
  } catch (err) {
    // 错误已在composable中处理
  }
};
</script>
```

### 5. 微信小程序

```javascript
// utils/api.js
const baseURL = 'https://your-domain.com';

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseURL + options.url,
      method: options.method || 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json',
        ...options.header
      },
      data: options.data,
      success: (res) => {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.message));
        }
      },
      fail: reject
    });
  });
}

// 确认就餐
export const confirmDiningManually = (orderId) => {
  return request({
    url: `/api/dining-confirmation/manual/${orderId}`,
    method: 'POST',
    data: {
      confirmationType: 'manual'
    }
  });
};

// 页面中使用
Page({
  data: {
    orderId: '',
    loading: false
  },

  async onConfirmDining() {
    this.setData({ loading: true });

    try {
      const result = await confirmDiningManually(this.data.orderId);
      
      wx.showToast({
        title: '确认就餐成功',
        icon: 'success'
      });
      
      // 更新页面状态
      this.setData({
        diningStatus: 'dined',
        actualDiningTime: result.actualDiningTime
      });
      
    } catch (error) {
      wx.showToast({
        title: error.message || '确认就餐失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
```

## 🚨 错误处理

### 常见错误码

| 状态码 | 错误信息 | 处理建议 |
|--------|----------|----------|
| 404 | 订单不存在或无权操作 | 检查订单ID是否正确，用户是否有权限 |
| 400 | 订单已取消 | 提示用户订单已取消 |
| 400 | 该订单已确认就餐 | 提示用户已确认过，不能重复确认 |
| 400 | 当前时间不在就餐时间内 | 提示用户当前时间不在就餐时间范围内 |
| 401 | 未授权 | 提示用户重新登录 |
| 500 | 服务器错误 | 提示用户稍后重试 |

### 错误处理函数

```javascript
function handleConfirmationError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;
  
  switch (status) {
    case 404:
      return '订单不存在或您无权操作此订单';
    case 400:
      if (message.includes('已确认就餐')) {
        return '该订单已确认就餐，不能重复确认';
      } else if (message.includes('已取消')) {
        return '订单已取消，无法确认就餐';
      } else if (message.includes('不在就餐时间内')) {
        return '当前时间不在就餐时间范围内';
      }
      return message;
    case 401:
      return '登录已过期，请重新登录';
    case 500:
      return '服务器错误，请稍后重试';
    default:
      return '确认就餐失败，请稍后重试';
  }
}
```

## 📊 相关接口

### 获取就餐状态
```javascript
// GET /api/dining-confirmation/status?date=2025-09-11
const getDiningStatus = async (date) => {
  const response = await fetch(`${API_BASE}/status?date=${date}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 获取确认历史
```javascript
// GET /api/dining-confirmation/history?page=1&pageSize=20
const getConfirmationHistory = async (page = 1, pageSize = 20) => {
  const response = await fetch(`${API_BASE}/history?page=${page}&pageSize=${pageSize}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

## 🔧 测试用例

```javascript
// 测试确认就餐
async function testConfirmDining() {
  const testOrderId = '917a80ca-bc11-4458-a72f-04122a4b37a7';
  const testToken = 'your-jwt-token';
  
  try {
    const result = await confirmDiningManually(testOrderId, testToken);
    console.log('✅ 确认成功:', result);
  } catch (error) {
    console.log('❌ 确认失败:', error.message);
  }
}

// 运行测试
testConfirmDining();
```

---

## 📝 注意事项

1. **Token管理**: 确保JWT Token有效且未过期
2. **错误处理**: 根据状态码提供相应的用户提示
3. **加载状态**: 显示加载状态，避免重复提交
4. **数据同步**: 确认成功后及时更新UI状态
5. **权限验证**: 确保只有订单所有者才能确认就餐

这个API清单提供了简洁明了的前端对接指南，包含了各种前端框架的实现示例。
