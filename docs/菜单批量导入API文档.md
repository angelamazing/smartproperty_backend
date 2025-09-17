# 菜单批量导入API文档

## 📋 功能概述

菜单批量导入功能支持通过Excel文件批量创建一周的早中晚餐菜单，大大提高菜单管理效率。

## 🎯 核心特性

- ✅ **Excel解析**：支持.xlsx和.xls格式文件解析
- ✅ **批量导入**：支持一次导入一周21个菜单（7天×3餐次）
- ✅ **灵活导入**：支持只导入早餐、中餐或晚餐
- ✅ **工作日菜单**：支持只导入工作日菜单（周一到周五），周末不提供菜单
- ✅ **任意日期**：支持任意日期的菜单导入，不要求连续日期
- ✅ **数据验证**：完整的Excel数据格式验证和错误提示
- ✅ **预览功能**：导入前可预览数据避免错误
- ✅ **覆盖选项**：支持覆盖现有菜单
- ✅ **自动创建**：自动创建不存在的菜品和分类
- ✅ **导入历史**：完整的导入历史记录

## 🔗 API接口列表

### 1. 下载Excel导入模板

**接口地址**: `GET /api/admin/menu/import/template`

**功能描述**: 下载标准的Excel导入模板文件

**请求头**:
```http
Authorization: Bearer {admin_token}
```

**响应**: Excel文件下载

**示例**:
```bash
curl -H "Authorization: Bearer your_token" \
     -o "菜单导入模板.xlsx" \
     http://localhost:3000/api/admin/menu/import/template
```

### 2. 上传并解析Excel文件

**接口地址**: `POST /api/admin/menu/import/parse`

**功能描述**: 上传Excel文件并解析为JSON数据，进行初步验证

**请求头**:
```http
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data
```

**请求参数**:
- `excel`: Excel文件 (文件大小限制5MB)

**响应示例**:
```json
{
  "success": true,
  "message": "文件解析成功",
  "data": {
    "parseResult": {
      "success": true,
      "summary": {
        "totalRows": 14,
        "validRows": 14,
        "errorRows": 0
      },
      "errors": []
    },
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": [],
      "statistics": {
        "totalItems": 14,
        "dateRange": {
          "start": "2025-09-20",
          "end": "2025-09-21",
          "count": 2
        },
        "mealTypeStats": 6,
        "uniqueDishes": 12
      }
    },
    "preview": [
      {
        "date": "2025-09-20",
        "mealType": "breakfast",
        "dishName": "小笼包",
        "dishPrice": 8,
        "dishCategory": "面点",
        "sort": 1,
        "remark": "上海风味小笼包"
      }
    ],
    "filename": "test-menu-data.xlsx",
    "fileSize": 12345
  }
}
```

### 3. 预览导入数据

**接口地址**: `POST /api/admin/menu/import/preview`

**功能描述**: 预览即将导入的菜单数据，检查是否有冲突

**请求头**:
```http
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**请求参数**:
```json
{
  "menuData": [
    {
      "date": "2025-09-20",
      "mealType": "breakfast",
      "dishName": "小笼包",
      "dishPrice": 8,
      "dishCategory": "面点",
      "sort": 1,
      "remark": "上海风味小笼包"
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "数据预览生成成功",
  "data": {
    "preview": [
      {
        "date": "2025-09-20",
        "mealType": "breakfast",
        "mealTypeName": "早餐",
        "dishCount": 3,
        "dishes": [
          {
            "name": "小笼包",
            "price": 8,
            "category": "面点",
            "sort": 1
          }
        ],
        "existingMenu": null,
        "action": "create"
      }
    ],
    "summary": {
      "totalMenus": 6,
      "newMenus": 6,
      "updateMenus": 0,
      "totalDishes": 14,
      "dateRange": {
        "start": "2025-09-20",
        "end": "2025-09-21"
      }
    }
  }
}
```

### 4. 执行批量导入

**接口地址**: `POST /api/admin/menu/import/execute`

**功能描述**: 执行批量导入菜单操作

**请求头**:
```http
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**请求参数**:
```json
{
  "menuData": [
    {
      "date": "2025-09-20",
      "mealType": "breakfast",
      "dishName": "小笼包",
      "dishPrice": 8,
      "dishCategory": "面点",
      "sort": 1,
      "remark": "上海风味小笼包"
    }
  ],
  "options": {
    "overwrite": true,           // 是否覆盖现有菜单
    "allowPastDates": false,     // 是否允许过去日期
    "description": "批量导入的菜单"  // 菜单描述
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "批量导入成功，共创建 6 个菜单",
  "data": {
    "summary": {
      "totalMenus": 6,
      "successCount": 6,
      "failedCount": 0
    },
    "success": [
      {
        "date": "2025-09-20",
        "mealType": "breakfast",
        "mealTypeName": "早餐",
        "menuId": "menu-uuid-123",
        "dishCount": 3,
        "action": "created"
      }
    ],
    "failed": [],
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

### 5. 获取导入历史

**接口地址**: `GET /api/admin/menu/import/history`

**功能描述**: 获取菜单导入历史记录

**请求头**:
```http
Authorization: Bearer {admin_token}
```

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认20，最大100

**响应示例**:
```json
{
  "success": true,
  "message": "获取导入历史成功",
  "data": {
    "list": [
      {
        "id": "log-uuid-123",
        "importTime": "2025-09-18T10:30:00Z",
        "summary": {
          "totalMenus": 6,
          "successCount": 6,
          "failedCount": 0
        },
        "filename": "test-menu-data.xlsx",
        "status": "success",
        "ipAddress": "192.168.1.100"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

## 📊 Excel模板格式

### 必需列

| 列名 | 说明 | 示例 | 必填 |
|------|------|------|------|
| 日期 | 菜单日期，格式YYYY-MM-DD | 2025-09-20 | ✅ |
| 餐次类型 | 早餐/中餐/晚餐 | 早餐 | ✅ |
| 菜品名称 | 菜品名称 | 小笼包 | ✅ |
| 菜品价格 | 菜品价格，数字 | 8.00 | ❌ |
| 菜品分类 | 菜品分类 | 面点 | ❌ |
| 排序 | 菜品显示排序 | 1 | ❌ |
| 备注 | 菜品备注信息 | 上海风味 | ❌ |

### 数据格式要求

1. **日期格式**：
   - 支持：2025-09-20、2025/09/20
   - 支持Excel日期格式
   - 不能是过去的日期（除非设置允许）

2. **餐次类型**：
   - 支持：早餐、中餐、晚餐
   - 支持：breakfast、lunch、dinner
   - 不区分大小写

3. **菜品价格**：
   - 数字格式，支持小数
   - 默认值为0
   - 自动去除货币符号

4. **排序**：
   - 整数，用于控制菜品显示顺序
   - 默认按Excel中的顺序

## 🔧 使用流程

### 完整导入流程

1. **下载模板**
   ```bash
   GET /api/admin/menu/import/template
   ```

2. **填写Excel数据**
   - 按模板格式填写菜单数据
   - 支持多日期、多餐次

3. **上传解析文件**
   ```bash
   POST /api/admin/menu/import/parse
   ```

4. **预览导入数据**
   ```bash
   POST /api/admin/menu/import/preview
   ```

5. **执行批量导入**
   ```bash
   POST /api/admin/menu/import/execute
   ```

6. **查看导入结果**
   ```bash
   GET /api/admin/menu/import/history
   ```

### 只导入特定餐次

如果只想导入一周的早餐，在Excel中只填写餐次类型为"早餐"的数据即可：

```excel
日期        餐次类型  菜品名称    菜品价格
2025-09-20  早餐     小笼包      8.00
2025-09-20  早餐     豆浆        3.00
2025-09-21  早餐     包子        6.00
2025-09-21  早餐     小米粥      4.00
...
```

### 只导入工作日菜单（周一到周五）

如果周末不提供菜单，只填写工作日的菜单数据：

```excel
日期        餐次类型  菜品名称    菜品价格
2025-09-23  早餐     小笼包      8.00    # 周一
2025-09-23  中餐     红烧肉      25.00
2025-09-23  晚餐     蒸蛋        8.00
2025-09-24  早餐     包子        6.00    # 周二
2025-09-24  中餐     糖醋里脊    22.00
2025-09-24  晚餐     青菜汤      6.00
...
2025-09-27  早餐     烧饼        4.00    # 周五
2025-09-27  中餐     回锅肉      24.00
2025-09-27  晚餐     冬瓜汤      5.00
# 周六周日不提供菜单，不填写即可
```

### 只导入特定日期的菜单

系统支持任意日期的菜单导入，不要求连续：

```excel
日期        餐次类型  菜品名称    菜品价格
2025-09-23  早餐     小笼包      8.00    # 周一
2025-09-25  中餐     宫保鸡丁    20.00   # 周三
2025-09-27  晚餐     蛋花汤      5.00    # 周五
# 只导入这3个特定日期的特定餐次
```

## ⚠️ 注意事项

### 数据验证规则

1. **必填字段验证**：日期、餐次类型、菜品名称不能为空
2. **日期验证**：默认不允许导入过去日期的菜单
3. **重复检查**：同一餐次中不能有重复菜品
4. **文件大小**：Excel文件最大5MB
5. **数据量限制**：单次最多导入1000条记录

### 覆盖规则

- 如果菜单已存在且状态为"草稿"，可以选择覆盖
- 如果菜单已发布，无法覆盖，需要先撤回
- 覆盖时会删除原有菜品，重新创建

### 自动创建规则

- 如果菜品不存在，会自动创建新菜品
- 如果菜品分类不存在，会自动创建新分类
- 自动创建的菜品状态为"active"

## 🧪 测试脚本

项目提供了完整的测试脚本：

```bash
node scripts/test-menu-import.js
```

测试脚本会执行以下操作：
1. 管理员登录
2. 下载Excel模板
3. 创建测试数据
4. 上传解析文件
5. 预览导入数据
6. 执行批量导入
7. 查看导入历史

## 🎯 使用场景

### 场景1：批量导入一周菜单
适用于提前规划一周的早中晚餐菜单。

### 场景2：只导入早餐菜单
适用于只需要管理早餐的场景，Excel中只填写早餐数据。

### 场景3：更新现有菜单
适用于需要批量更新已有菜单的场景，设置覆盖选项。

### 场景4：菜单模板复用
下载模板后可以作为标准格式，方便重复使用。

## 🔍 错误处理

### 常见错误及解决方案

1. **"文件格式不支持"**
   - 确保上传的是.xlsx或.xls格式文件

2. **"日期格式不正确"**
   - 使用YYYY-MM-DD格式，如：2025-09-20

3. **"餐次类型无效"**
   - 使用：早餐、中餐、晚餐 或 breakfast、lunch、dinner

4. **"菜单已发布，无法覆盖"**
   - 先撤回已发布的菜单，或选择不覆盖

5. **"文件大小超过限制"**
   - 文件大小不能超过5MB

## 📱 前端集成示例

### JavaScript示例

```javascript
// 1. 下载模板
async function downloadTemplate() {
  const response = await fetch('/api/admin/menu/import/template', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '菜单导入模板.xlsx';
    a.click();
  }
}

// 2. 上传并解析文件
async function uploadAndParse(file) {
  const formData = new FormData();
  formData.append('excel', file);
  
  const response = await fetch('/api/admin/menu/import/parse', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
}

// 3. 执行导入
async function executeImport(menuData, options) {
  const response = await fetch('/api/admin/menu/import/execute', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      menuData,
      options
    })
  });
  
  return await response.json();
}
```

## 📈 性能优化

1. **分批处理**：大量数据自动分批处理，避免超时
2. **事务处理**：使用数据库事务确保数据一致性
3. **错误隔离**：单个菜单创建失败不影响其他菜单
4. **内存优化**：使用流式处理大文件
5. **缓存优化**：菜品查询使用缓存提高性能

---

**开发者**: 湖北省地质局第三地质大队  
**版本**: 1.0.0  
**更新时间**: 2025-09-18
