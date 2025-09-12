const { getCorsConfig, getAllowedOrigins } = require('./config/cors');

async function testCorsConfig() {
  console.log('🧪 测试CORS配置...\n');

  // 测试不同环境的CORS配置
  const environments = ['development', 'production', 'test'];
  
  for (const env of environments) {
    console.log(`📋 ${env.toUpperCase()} 环境配置:`);
    
    const corsConfig = getCorsConfig(env);
    const allowedOrigins = getAllowedOrigins();
    
    console.log(`  允许的域名数量: ${allowedOrigins.length}`);
    console.log(`  允许的域名: ${allowedOrigins.join(', ')}`);
    
    // 测试一些常见的域名
    const testOrigins = [
      'http://localhost:3000',
      'https://your-domain.com',
      'https://www.your-domain.com',
      'https://malicious-site.com'
    ];
    
    console.log(`  测试域名:`);
    for (const origin of testOrigins) {
      try {
        corsConfig.origin(origin, (err, result) => {
          if (err) {
            console.log(`    ❌ ${origin} - 被阻止`);
          } else {
            console.log(`    ✅ ${origin} - 允许`);
          }
        });
      } catch (error) {
        console.log(`    ❌ ${origin} - 错误: ${error.message}`);
      }
    }
    
    console.log('');
  }

  // 测试环境变量配置
  console.log('🔧 环境变量配置测试:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`  ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'undefined'}`);
  
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    console.log(`  环境变量域名: ${envOrigins.join(', ')}`);
  }
  
  console.log('\n✅ CORS配置测试完成');
}

testCorsConfig().catch(console.error);
