const fs = require('fs');
const path = require('path');

/**
 * 代码质量全面验证脚本
 * 检查核心业务代码的质量、结构和最佳实践
 */
async function validateCodeQuality() {
  console.log('🚀 开始代码质量全面验证...\n');
  
  // 1. 检查项目结构
  console.log('📁 第一步：项目结构检查');
  await validateProjectStructure();
  
  // 2. 检查核心服务代码
  console.log('\n🔧 第二步：核心服务代码检查');
  await validateServiceCode();
  
  // 3. 检查控制器代码
  console.log('\n🎮 第三步：控制器代码检查');
  await validateControllerCode();
  
  // 4. 检查路由代码
  console.log('\n🛣️  第四步：路由代码检查');
  await validateRouteCode();
  
  // 5. 检查中间件代码
  console.log('\n🔌 第五步：中间件代码检查');
  await validateMiddlewareCode();
  
  // 6. 检查工具类代码
  console.log('\n🛠️  第六步：工具类代码检查');
  await validateUtilityCode();
  
  // 7. 检查配置文件
  console.log('\n⚙️  第七步：配置文件检查');
  await validateConfigFiles();
  
  // 8. 检查数据库交互代码
  console.log('\n🗄️  第八步：数据库交互代码检查');
  await validateDatabaseInteraction();
}

/**
 * 检查项目结构
 */
async function validateProjectStructure() {
  const expectedStructure = {
    'config/': ['database.js'],
    'controllers/': ['authController.js', 'userController.js', 'diningController.js', 'adminController.js'],
    'services/': ['authService.js', 'userService.js', 'diningService.js', 'adminService.js', 'systemService.js'],
    'routes/': ['auth.js', 'user.js', 'dining.js', 'admin.js', 'system.js', 'reservation.js', 'venue.js'],
    'middleware/': ['auth.js', 'validation.js', 'performance.js'],
    'utils/': ['logger.js', 'response.js', 'helpers.js'],
    'scripts/': ['initDatabaseComplete.js', 'create-missing-tables.js']
  };
  
  for (const [dir, expectedFiles] of Object.entries(expectedStructure)) {
    if (fs.existsSync(dir)) {
      console.log(`  ✅ ${dir} 目录存在`);
      
      const actualFiles = fs.readdirSync(dir);
      for (const expectedFile of expectedFiles) {
        if (actualFiles.includes(expectedFile)) {
          console.log(`    ✅ ${expectedFile}`);
        } else {
          console.log(`    ❌ ${expectedFile} - 缺失`);
        }
      }
    } else {
      console.log(`  ❌ ${dir} 目录缺失`);
    }
  }
  
  // 检查根目录文件
  const rootFiles = ['server.js', 'package.json', 'README.md'];
  console.log('\n  检查根目录文件:');
  for (const file of rootFiles) {
    if (fs.existsSync(file)) {
      console.log(`    ✅ ${file}`);
    } else {
      console.log(`    ❌ ${file} - 缺失`);
    }
  }
}

/**
 * 检查核心服务代码
 */
async function validateServiceCode() {
  const serviceFiles = [
    'services/authService.js',
    'services/userService.js', 
    'services/diningService.js',
    'services/adminService.js',
    'services/systemService.js'
  ];
  
  for (const file of serviceFiles) {
    if (fs.existsSync(file)) {
      console.log(`  📋 检查 ${file}:`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件大小
        const stats = fs.statSync(file);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`    文件大小: ${fileSizeKB} KB`);
        
        // 检查代码行数
        const lines = content.split('\n');
        const codeLines = lines.filter(line => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*'));
        console.log(`    总行数: ${lines.length}, 代码行数: ${codeLines.length}`);
        
        // 检查关键模式
        const patterns = {
          'async/await': content.includes('async') && content.includes('await'),
          '错误处理': content.includes('try') && content.includes('catch'),
          '日志记录': content.includes('logger') || content.includes('console.log'),
          '参数验证': content.includes('validate') || content.includes('check'),
          '数据库查询': content.includes('db.execute') || content.includes('db.query')
        };
        
        for (const [pattern, exists] of Object.entries(patterns)) {
          console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
        }
        
        // 检查函数定义
        const functionMatches = content.match(/async\s+function\s+\w+/g) || [];
        const methodMatches = content.match(/async\s+\w+\s*\(/g) || [];
        const totalFunctions = functionMatches.length + methodMatches.length;
        console.log(`    异步函数数量: ${totalFunctions}`);
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  }
}

/**
 * 检查控制器代码
 */
async function validateControllerCode() {
  const controllerFiles = [
    'controllers/authController.js',
    'controllers/userController.js',
    'controllers/diningController.js',
    'controllers/adminController.js'
  ];
  
  for (const file of controllerFiles) {
    if (fs.existsSync(file)) {
      console.log(`  📋 检查 ${file}:`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件大小
        const stats = fs.statSync(file);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`    文件大小: ${fileSizeKB} KB`);
        
        // 检查关键模式
        const patterns = {
          '错误处理': content.includes('try') && content.includes('catch'),
          '响应格式化': content.includes('response.success') || content.includes('response.error'),
          '参数验证': content.includes('req.body') || content.includes('req.params'),
          '服务调用': content.includes('Service.') || content.includes('await'),
          '日志记录': content.includes('logger') || content.includes('console.log')
        };
        
        for (const [pattern, exists] of Object.entries(patterns)) {
          console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
        }
        
        // 检查函数数量
        const functionMatches = content.match(/exports\.\w+\s*=\s*async\s+function/g) || [];
        console.log(`    导出函数数量: ${functionMatches.length}`);
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  }
}

/**
 * 检查路由代码
 */
async function validateRouteCode() {
  const routeFiles = [
    'routes/auth.js',
    'routes/user.js',
    'routes/dining.js',
    'routes/admin.js',
    'routes/system.js'
  ];
  
  for (const file of routeFiles) {
    if (fs.existsSync(file)) {
      console.log(`  📋 检查 ${file}:`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件大小
        const stats = fs.statSync(file);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`    文件大小: ${fileSizeKB} KB`);
        
        // 检查关键模式
        const patterns = {
          '路由定义': content.includes('router.') && (content.includes('get') || content.includes('post')),
          '中间件使用': content.includes('authenticateToken') || content.includes('require'),
          '错误处理': content.includes('try') && content.includes('catch'),
          '响应格式化': content.includes('response.success') || content.includes('res.json'),
          '日志记录': content.includes('logger')
        };
        
        for (const [pattern, exists] of Object.entries(patterns)) {
          console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
        }
        
        // 检查路由数量
        const routeMatches = content.match(/router\.(get|post|put|delete)/g) || [];
        console.log(`    路由数量: ${routeMatches.length}`);
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  }
}

/**
 * 检查中间件代码
 */
async function validateMiddlewareCode() {
  const middlewareFiles = [
    'middleware/auth.js',
    'middleware/validation.js',
    'middleware/performance.js'
  ];
  
  for (const file of middlewareFiles) {
    if (fs.existsSync(file)) {
      console.log(`  📋 检查 ${file}:`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件大小
        const stats = fs.statSync(file);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`    文件大小: ${fileSizeKB} KB`);
        
        // 检查关键模式
        const patterns = {
          '中间件函数': content.includes('module.exports') || content.includes('exports'),
          'next()调用': content.includes('next()'),
          '错误处理': content.includes('try') && content.includes('catch'),
          'JWT验证': content.includes('jwt') || content.includes('verify'),
          '权限检查': content.includes('role') || content.includes('permission')
        };
        
        for (const [pattern, exists] of Object.entries(patterns)) {
          console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
        }
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  }
}

/**
 * 检查工具类代码
 */
async function validateUtilityCode() {
  const utilityFiles = [
    'utils/logger.js',
    'utils/response.js',
    'utils/helpers.js'
  ];
  
  for (const file of utilityFiles) {
    if (fs.existsSync(file)) {
      console.log(`  📋 检查 ${file}:`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件大小
        const stats = fs.statSync(file);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`    文件大小: ${fileSizeKB} KB`);
        
        // 检查关键模式
        const patterns = {
          '模块导出': content.includes('module.exports') || content.includes('exports'),
          '函数定义': content.includes('function') || content.includes('=>'),
          '错误处理': content.includes('try') && content.includes('catch'),
          '日志功能': content.includes('winston') || content.includes('console'),
          '响应格式化': content.includes('success') || content.includes('error')
        };
        
        for (const [pattern, exists] of Object.entries(patterns)) {
          console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
        }
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  }
}

/**
 * 检查配置文件
 */
async function validateConfigFiles() {
  const configFiles = [
    'config/database.js',
    'package.json'
  ];
  
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      console.log(`  📋 检查 ${file}:`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件大小
        const stats = fs.statSync(file);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`    文件大小: ${fileSizeKB} KB`);
        
        if (file === 'config/database.js') {
          const patterns = {
            '数据库配置': content.includes('host') && content.includes('port'),
            'JWT配置': content.includes('jwt') && content.includes('secret'),
            '业务配置': content.includes('business') && content.includes('verificationCodeExpiry'),
            '测试配置': content.includes('testLogin') && content.includes('enabled')
          };
          
          for (const [pattern, exists] of Object.entries(patterns)) {
            console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
          }
        } else if (file === 'package.json') {
          const patterns = {
            '项目信息': content.includes('name') && content.includes('version'),
            '依赖管理': content.includes('dependencies') && content.includes('devDependencies'),
            '脚本配置': content.includes('scripts') && content.includes('start'),
            '引擎要求': content.includes('engines') && content.includes('node')
          };
          
          for (const [pattern, exists] of Object.entries(patterns)) {
            console.log(`    ${exists ? '✅' : '❌'} ${pattern}`);
          }
        }
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    } else {
      console.log(`  ❌ ${file} 不存在`);
    }
  }
}

/**
 * 检查数据库交互代码
 */
async function validateDatabaseInteraction() {
  console.log('  📋 检查数据库交互模式:');
  
  // 检查关键服务文件中的数据库交互
  const serviceFiles = [
    'services/systemService.js',
    'services/userService.js',
    'services/diningService.js'
  ];
  
  for (const file of serviceFiles) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查数据库交互模式
        const patterns = {
          '参数化查询': content.includes('db.execute') && content.includes('?'),
          '事务处理': content.includes('BEGIN') || content.includes('COMMIT') || content.includes('ROLLBACK'),
          '连接管理': content.includes('connection') && content.includes('release'),
          '错误处理': content.includes('try') && content.includes('catch'),
          'SQL注入防护': !content.includes('${') || content.includes('db.execute')
        };
        
        console.log(`    ${file}:`);
        for (const [pattern, exists] of Object.entries(patterns)) {
          console.log(`      ${exists ? '✅' : '❌'} ${pattern}`);
        }
        
      } catch (error) {
        console.log(`    ❌ 读取文件失败: ${error.message}`);
      }
    }
  }
  
  // 检查服务器文件中的数据库连接池
  if (fs.existsSync('server.js')) {
    try {
      const content = fs.readFileSync('server.js', 'utf8');
      
      const patterns = {
        '连接池创建': content.includes('createPool'),
        '中间件注入': content.includes('req.db'),
        '错误处理': content.includes('catch') && content.includes('error'),
        '健康检查': content.includes('ping') || content.includes('health')
      };
      
      console.log('    server.js:');
      for (const [pattern, exists] of Object.entries(patterns)) {
        console.log(`      ${exists ? '✅' : '❌'} ${pattern}`);
      }
      
    } catch (error) {
      console.log(`    ❌ 读取server.js失败: ${error.message}`);
    }
  }
}

// 运行验证
validateCodeQuality();
