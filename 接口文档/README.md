# 部门报餐系统 - 前端对接文档

## 📁 文档结构

```
接口文档/
├── README.md                           # 本文档
├── 前端测试登录对接文档.md              # 详细的测试登录文档
├── 测试登录页面.html                    # 可视化测试页面
├── 部门报餐功能对接文档.md              # 完整功能文档
├── 部门报餐API接口列表.md               # 接口列表
├── 前端集成示例.js                      # 代码示例
└── 部门管理员登录测试示例.js            # 测试脚本
```

## 🚀 快速开始

### 1. 启动后端服务
```bash
cd /home/devbox/project
node server.js
```

### 2. 选择测试方式

#### 方式一：可视化测试页面（推荐）
1. 打开 `测试登录页面.html` 文件
2. 点击相应的登录按钮
3. 测试API功能

#### 方式二：命令行测试
```bash
# 测试所有部门
node 接口文档/部门管理员登录测试示例.js

# 测试指定部门
node 接口文档/部门管理员登录测试示例.js GEO_DATA
```

#### 方式三：代码集成
参考 `前端集成示例.js` 中的代码示例

## 🔐 测试登录接口

### 基础角色登录
- **普通用户**: `POST /api/auth/test-login`
- **部门管理员**: `POST /api/auth/test-login-admin`
- **系统管理员**: `POST /api/auth/test-login-sys-admin`

### 指定部门登录 ⭐
- **接口**: `POST /api/auth/test-login-dept-admin`
- **参数**: `{ "departmentCode": "GEO_DATA" }`

### 支持的部门代码
| 代码 | 部门名称 | 管理员手机号 |
|------|----------|-------------|
| `GEO_DATA` | 地质数据中心 | 13800001001 |
| `GEO_ENG` | 地质工程中心 | 13800001002 |
| `ECO_ENV` | 生态环境中心 | 13800001003 |
| `GEO_ENV` | 地质环境中心 | 13800001004 |
| `GEO_SURVEY` | 地质调查中心 | 13800001005 |
| `HUANGMEI` | 黄梅分站 | 13800001006 |
| `MINING_CO` | 矿业有限责任公司 | 13800001007 |
| `PROPERTY` | 物业中心 | 13800001008 |
| `ADMIN` | 机关科室 | 13800001009 |
| `TECH` | 技术部 | 13800000001 |

## 📋 核心功能API

### 部门管理
- `GET /api/dining/enhanced/dept-members` - 获取部门成员
- `POST /api/dining/enhanced/department-order` - 部门报餐
- `GET /api/dining/enhanced/department-orders` - 获取报餐记录
- `GET /api/dining/enhanced/department-stats` - 获取报餐统计
- `GET /api/dining/enhanced/department-overview` - 获取报餐概览

## 💡 使用示例

### JavaScript Fetch API
```javascript
// 登录地质数据中心管理员
const response = await fetch('/api/auth/test-login-dept-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ departmentCode: 'GEO_DATA' })
});

const data = await response.json();
const token = data.data.token;

// 使用token调用其他API
const members = await fetch('/api/dining/enhanced/dept-members', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Axios
```javascript
// 登录
const loginResponse = await axios.post('/api/auth/test-login-dept-admin', {
  departmentCode: 'GEO_DATA'
});

// 设置token
axios.defaults.headers.common['Authorization'] = `Bearer ${loginResponse.data.data.token}`;

// 调用API
const members = await axios.get('/api/dining/enhanced/dept-members');
```

## 🧪 测试场景

### 1. 权限测试
- 普通用户：只能查看自己的信息
- 部门管理员：可以管理本部门
- 系统管理员：可以管理所有部门

### 2. 部门隔离测试
- 验证部门管理员只能看到本部门成员
- 验证无法跨部门操作

### 3. 功能测试
- 部门成员列表获取
- 部门报餐功能
- 报餐记录查询
- 统计信息获取

## ⚠️ 注意事项

1. **仅开发环境**: 测试登录接口仅在开发环境可用
2. **Token有效期**: 测试Token有效期为24小时
3. **权限控制**: 不同角色有不同的权限范围
4. **部门隔离**: 部门管理员只能管理本部门数据
5. **数据安全**: 请勿在生产环境使用测试接口

## 🔧 故障排除

### 常见问题

1. **401 未授权**
   - 检查Token是否正确设置
   - 确认Token是否过期

2. **403 权限不足**
   - 确认用户角色权限
   - 检查是否尝试跨部门操作

3. **500 服务器错误**
   - 检查后端服务是否正常运行
   - 查看服务器日志

### 调试技巧

1. **查看网络请求**: 使用浏览器开发者工具
2. **检查响应数据**: 确认API返回的数据格式
3. **验证Token**: 使用JWT解码工具查看Token内容

## 📞 技术支持

如有问题，请：
1. 查看详细文档：`前端测试登录对接文档.md`
2. 运行测试脚本验证功能
3. 检查服务器日志：`logs/combined.log`

## 📝 更新日志

- **2025-09-02**: 完成部门报餐功能开发
- **2025-09-02**: 添加指定部门管理员登录接口
- **2025-09-02**: 创建可视化测试页面
- **2025-09-02**: 完善前端对接文档