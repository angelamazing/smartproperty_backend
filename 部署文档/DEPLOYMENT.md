# 智慧物业管理系统 - 部署指南

## 📖 概述

本文档详细说明智慧物业管理系统的部署流程，包括开发环境和生产环境的配置、启动和管理。

## 🚀 快速部署

### 1. 环境准备

#### 系统要求
- **Node.js**: >= 16.0.0
- **MySQL**: >= 8.0
- **npm**: >= 8.0.0
- **操作系统**: Linux/macOS/Windows
- **内存**: >= 2GB
- **磁盘空间**: >= 10GB

#### 安装依赖
```bash
# 安装项目依赖
npm install

# 安装开发依赖（开发环境）
npm install --dev
```

### 2. 数据库配置

#### 创建数据库
```sql
-- 创建数据库
CREATE DATABASE smart_property CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选）
CREATE USER 'smart_property_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON smart_property.* TO 'smart_property_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 配置数据库连接
编辑 `config/database.js` 文件：

```javascript
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'smart_property',
    charset: 'utf8mb4',
    timezone: '+08:00',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
};
```

#### 环境变量配置
创建 `.env` 文件：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_property

# JWT配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=development
```

#### 初始化数据库
```bash
# 完整初始化（推荐）
npm run init-db-complete

# 验证数据库结构
npm run verify-db
```

初始化完成后，系统会创建：
- ✅ 27个数据表
- ✅ 默认部门数据
- ✅ 角色权限数据
- ✅ 系统配置数据
- ✅ 默认管理员账号

### 3. 启动服务

#### 开发环境

**后端服务启动:**
```bash
# 使用nodemon启动（推荐）
npm run dev

# 或直接启动
node server.js
```

**前端服务启动:**
```bash
# 使用Vite（推荐）
npm run dev:frontend

# 或使用Vue CLI
npm run serve
```

**开发环境特点:**
- 自动重启服务
- 热重载支持
- 详细错误信息
- 代理配置自动生效

#### 生产环境

**后端服务启动:**
```bash
# 设置生产环境
export NODE_ENV=production

# 启动服务
npm start

# 或使用PM2（推荐）
npm install -g pm2
pm2 start server.js --name "smart-property-api"
```

**前端构建和部署:**
```bash
# 构建前端
npm run build

# 部署到Web服务器
# 将dist目录内容复制到Web服务器根目录
```

**生产环境特点:**
- 优化性能
- 压缩资源
- 安全配置
- 日志管理

#### 服务访问
- **后端API**: `http://localhost:3000`
- **前端应用**: `http://localhost:5175` (Vite) 或 `http://localhost:8080` (Vue CLI)
- **健康检查**: `http://localhost:3000/health`

## 🔑 默认账号

系统初始化后会创建以下默认管理员账号：

| 角色 | 手机号 | 密码 | 权限 |
|------|--------|------|------|
| 系统管理员 | 13800000001 | admin123 | 所有权限 |
| 普通管理员 | 13800000002 | admin123 | 基础管理权限 |

⚠️ **重要**: 生产环境部署后请立即修改默认密码！

## 🐳 Docker部署

### Dockerfile
```dockerfile
FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件所有者
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=smart_property_user
      - DB_PASSWORD=your_password
      - DB_NAME=smart_property
    depends_on:
      - mysql
    volumes:
      - ./logs:/app/logs
      - ./public/uploads:/app/public/uploads

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=smart_property
      - MYSQL_USER=smart_property_user
      - MYSQL_PASSWORD=your_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/initDatabase-complete.js:/docker-entrypoint-initdb.d/init.js

volumes:
  mysql_data:
```

### 启动Docker服务
```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📊 监控和日志

### 日志管理
```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看访问日志
tail -f logs/access.log
```

### 性能监控
```bash
# 使用PM2监控
pm2 monit

# 查看PM2状态
pm2 status

# 重启服务
pm2 restart smart-property-api
```

### 健康检查
```bash
# 检查服务状态
curl http://localhost:3000/health

# 检查数据库连接
curl http://localhost:3000/api/admin/system/status
```

## 📋 功能验证

### 1. 健康检查
```bash
curl http://localhost:3000/health
```

### 2. 管理员登录测试
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"13800000001","password":"admin123"}'
```

### 3. 运行完整测试
```bash
# 测试所有管理员接口
npm run test-admin

# 测试原有接口
npm run test-interfaces

# 测试完整系统
npm run test-system
```

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**解决方案:**
- 检查MySQL服务是否启动
- 验证数据库配置信息
- 确认防火墙设置

#### 2. 表不存在错误
```
Error: Table 'smart_property.users' doesn't exist
```
**解决方案:**
```bash
npm run init-db-complete
```

#### 3. 权限验证失败
```
Error: 权限不足，需要管理员权限
```
**解决方案:**
- 检查用户角色是否正确
- 验证JWT Token是否有效
- 确认用户状态为active

#### 4. 端口被占用
```
Error: listen EADDRINUSE :::3000
```
**解决方案:**
```bash
# 查找占用端口的进程
lsof -i :3000

# 或者更改端口
PORT=3001 npm start
```

### 调试模式
```bash
# 启用调试模式
DEBUG=* npm run dev

# 查看详细日志
tail -f logs/app.log
```

## 🏆 最佳实践

### 生产环境建议
1. **使用PM2管理进程**
2. **配置Nginx反向代理**
3. **启用HTTPS**
4. **定期备份数据库**
5. **监控系统资源使用**

### 安全建议
1. **修改默认密码**
2. **使用强密码策略**
3. **定期更新依赖**
4. **配置防火墙规则**
5. **启用访问日志**

### 性能优化
1. **使用Redis缓存**
2. **配置数据库连接池**
3. **启用Gzip压缩**
4. **优化静态资源**
5. **使用CDN加速**

## 📱 API文档

完整的API文档请参考：
- [接口文档索引](./接口文档/00-接口文档索引.md)
- [管理员接口文档](./接口文档/06-管理员接口-更新版.md)
- [角色管理接口](./接口文档/角色管理接口文档.md)
- [公告管理接口](./接口文档/公告管理接口文档.md)

## 🔄 版本更新

### 更新步骤
1. 备份数据库
2. 停止服务
3. 更新代码
4. 安装新依赖
5. 运行数据库更新脚本
6. 重启服务
7. 验证功能

### 数据库迁移
```bash
# 执行数据库更新
npm run update-db

# 验证更新结果
npm run verify-db
```

## 🤝 技术支持

如需技术支持，请：
1. 查看本文档的故障排除部分
2. 检查系统日志文件
3. 运行测试脚本诊断问题
4. 提供详细的错误信息和系统环境信息

---

**文档版本**: v1.4.0  
**最后更新**: 2025年1月  
**维护团队**: 湖北省地质局第三地质大队

