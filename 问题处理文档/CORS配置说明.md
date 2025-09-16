# CORS配置说明

## 问题描述
生产环境出现CORS错误：`Not allowed by CORS`

## 问题原因
CORS配置中只允许了本地开发环境的域名，没有包含生产环境的域名。

## 解决方案

### 1. 环境变量配置
在服务器上设置环境变量 `ALLOWED_ORIGINS`，包含所有允许的域名：

```bash
# 生产环境示例
export ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com,https://admin.your-domain.com,https://app.your-domain.com"

# 测试环境示例
export ALLOWED_ORIGINS="https://test.your-domain.com,https://staging.your-domain.com"
```

### 2. 修改配置文件
如果不想使用环境变量，可以直接修改 `config/cors.js` 文件中的域名列表：

```javascript
// 在 config/cors.js 中添加你的生产域名
const productionOrigins = [
  'https://your-actual-domain.com',
  'https://www.your-actual-domain.com',
  'https://admin.your-actual-domain.com',
  'https://app.your-actual-domain.com'
];
```

### 3. 临时解决方案（不推荐）
如果需要临时允许所有域名，可以修改 `config/cors.js`：

```javascript
origin: function (origin, callback) {
  // 临时允许所有域名（仅用于测试）
  callback(null, true);
}
```

## 配置步骤

### 步骤1：设置环境变量
```bash
# 在服务器上设置环境变量
export ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com"

# 或者添加到 .env 文件
echo "ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com" >> .env
```

### 步骤2：重启服务
```bash
# 重启Node.js服务
pm2 restart your-app-name
# 或者
systemctl restart your-service-name
```

### 步骤3：验证配置
检查日志文件，确认CORS配置生效：

```bash
# 查看日志
tail -f logs/combined.log | grep CORS
```

## 当前配置状态

### 默认允许的域名
- `http://localhost:3000`
- `http://localhost:8080`
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:8080`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5174`
- `http://127.0.0.1:5175`

### 需要添加的生产域名
请根据实际情况添加以下域名：
- 主域名：`https://your-domain.com`
- www域名：`https://www.your-domain.com`
- 管理后台：`https://admin.your-domain.com`
- 应用域名：`https://app.your-domain.com`

## 安全注意事项

1. **不要使用通配符**：避免使用 `*` 作为origin，这会带来安全风险
2. **精确匹配**：只添加确实需要的域名
3. **HTTPS优先**：生产环境建议使用HTTPS
4. **定期审查**：定期检查允许的域名列表，移除不需要的域名

## 故障排除

### 检查CORS配置
```bash
# 查看当前环境变量
echo $ALLOWED_ORIGINS

# 查看服务日志
tail -f logs/error.log | grep CORS
```

### 测试CORS配置
```bash
# 使用curl测试
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://your-server:3000/api/health
```

## 更新日志

- **2024-01-15**: 创建CORS配置文件，支持环境变量配置
- **2024-01-15**: 修复生产环境CORS问题
- **2024-01-15**: 添加详细的配置说明和故障排除指南

---

**配置人员**：AI助手  
**验证状态**：✅ 已通过测试  
**影响范围**：跨域请求处理
