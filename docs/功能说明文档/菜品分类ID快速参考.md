# 菜品分类ID快速参考

## 🚀 快速使用

**直接复制以下任一分类ID使用：**

### 🥩 荤菜类
```
fb195e2c-ed19-4ee7-a169-5e4f2db2af33
ed844f07-711f-444c-b5ec-e42c3464ab14
```

### 🥬 素菜类
```
4a100eca-009d-465f-b785-b237a75fa4f0
b34449ab-885b-4b71-ad23-7006e83c7986
```

### 🍚 主食类
```
846dad48-b408-4c44-ba27-00f4d193fcf6
a9065ca2-41e8-4cdd-ae44-12b86b0ece8e
```

### 🍲 汤类
```
3e50e11e-3c9c-4a64-a575-8e931ad6b722
a9617e1d-e83e-4852-ab77-b491eca28c54
```

### 🥤 饮品类
```
e55c23bc-3a41-45fe-b94c-ffbccfdf6edb
4a0f8976-9025-428f-b555-87ecca27d8fa
```

### 🧪 测试分类
```
cf082fe9-8569-11f0-baa3-beb6a6dc40f1
```

## 📝 使用示例

### 创建荤菜
```json
{
  "name": "宫保鸡丁",
  "categoryId": "fb195e2c-ed19-4ee7-a169-5e4f2db2af33",
  "description": "经典川菜",
  "price": 25.5
}
```

### 创建素菜
```json
{
  "name": "麻婆豆腐",
  "categoryId": "4a100eca-009d-465f-b785-b237a75fa4f0",
  "description": "四川传统名菜",
  "price": 18.0
}
```

### 创建主食
```json
{
  "name": "白米饭",
  "categoryId": "846dad48-b408-4c44-ba27-00f4d193fcf6",
  "description": "优质大米制作",
  "price": 3.0
}
```

## ⚠️ 注意事项

1. **不要使用简单数字ID**：如 "1", "2", "3" 等
2. **必须使用完整UUID**：如上面的36位字符串
3. **确保ID存在**：只使用上面列出的有效ID
4. **区分大小写**：ID中的字母大小写要正确

## 🔧 故障排除

### 如果仍然遇到外键约束错误：
1. 检查 `categoryId` 是否完全匹配上面的ID
2. 确保没有多余的空格或字符
3. 验证JSON格式是否正确
4. 确认使用的是 `categoryId` 而不是 `category_id`

### 获取最新分类列表：
```bash
GET /api/admin/dish-categories
```

## 📊 完整分类信息

| 分类名称 | 分类ID | 描述 | 状态 |
|----------|--------|------|------|
| 主食 | `846dad48-b408-4c44-ba27-00f4d193fcf6` | 米饭、面条等主食类 | active |
| 主食 | `a9065ca2-41e8-4cdd-ae44-12b86b0ece8e` | 米饭、面条等主食类 | active |
| 汤类 | `3e50e11e-3c9c-4a64-a575-8e931ad6b722` | 各种汤品 | active |
| 汤类 | `a9617e1d-e83e-4852-ab77-b491eca28c54` | 各种汤品 | active |
| 测试分类 | `cf082fe9-8569-11f0-baa3-beb6a6dc40f1` | 测试用分类 | active |
| 素菜 | `4a100eca-009d-465f-b785-b237a75fa4f0` | 蔬菜类菜品 | active |
| 素菜 | `b34449ab-885b-4b71-ad23-7006e83c7986` | 蔬菜类菜品 | active |
| 荤菜 | `ed844f07-711f-444c-b5ec-e42c3464ab14` | 肉类菜品 | active |
| 荤菜 | `fb195e2c-ed19-4ee7-a169-5e4f2db2af33` | 肉类菜品 | active |
| 饮品 | `4a0f8976-9025-428f-b555-87ecca27d8fa` | 饮料、果汁等 | active |
| 饮品 | `e55c23bc-3a41-45fe-b94c-ffbccfdf6edb` | 饮料、果汁等 | active |

---

**最后更新**: 2025-09-04  
**维护状态**: ✅ 所有分类ID已验证有效
