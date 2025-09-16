const moment = require('moment-timezone');

/**
 * 调试时间问题
 * 重新分析实际的问题场景
 */
function debugTimeIssue() {
  console.log('🔍 调试时间问题');
  console.log('=====================================');
  
  // 模拟实际场景
  console.log('\n📋 实际场景分析:');
  console.log('用户在北京时间 17:18 报餐');
  
  const userBeijingTime = '2025-09-11 17:18:00';
  console.log(`用户报餐时间: ${userBeijingTime}`);
  
  // 场景1：如果后端存储的是错误的UTC时间（当前问题）
  const wrongUTCStorage = '2025-09-11T17:18:00.000Z'; // 错误：本地时间当作UTC
  console.log(`\n❌ 当前错误存储: ${wrongUTCStorage}`);
  console.log(`前端显示: ${moment(wrongUTCStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  // 场景2：如果后端存储的是正确的UTC时间
  const correctUTCStorage = '2025-09-11T09:18:00.000Z'; // 正确：北京时间17:18对应UTC 09:18
  console.log(`\n✅ 正确存储应该是: ${correctUTCStorage}`);
  console.log(`前端显示: ${moment(correctUTCStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  // 场景3：如果用户说还是早了8小时，可能是什么情况？
  console.log(`\n🤔 如果用户说还是早了8小时，可能的情况:`);
  
  // 情况1：前端显示逻辑有问题
  const frontendDisplayIssue = moment(wrongUTCStorage).format('YYYY-MM-DD HH:mm:ss');
  console.log(`情况1 - 前端没有时区转换: ${frontendDisplayIssue}`);
  
  // 情况2：后端存储逻辑有问题
  const backendStorageIssue = moment(userBeijingTime).utc().toISOString();
  console.log(`情况2 - 后端应该存储: ${backendStorageIssue}`);
  
  // 情况3：时区设置有问题
  console.log(`\n🌍 时区信息:`);
  console.log(`服务器时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`当前UTC时间: ${moment().utc().format('YYYY-MM-DD HH:mm:ss')}`);
  console.log(`当前北京时间: ${moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  // 情况4：数据库时区设置
  console.log(`\n💾 数据库时区检查:`);
  console.log(`如果数据库时区设置为UTC，存储 ${correctUTCStorage}`);
  console.log(`前端读取后转换: ${moment(correctUTCStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  console.log(`如果数据库时区设置为+08:00，存储 ${correctUTCStorage}`);
  console.log(`前端读取后转换: ${moment(correctUTCStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
}

/**
 * 分析可能的问题原因
 */
function analyzePossibleIssues() {
  console.log('\n🔍 可能的问题原因分析:');
  console.log('=====================================');
  
  console.log('\n1. 前端显示问题:');
  console.log('   - 前端可能没有正确使用时区转换');
  console.log('   - 前端可能直接显示UTC时间');
  
  console.log('\n2. 后端存储问题:');
  console.log('   - 后端可能仍然在错误地存储时间');
  console.log('   - 后端可能没有使用修复后的代码');
  
  console.log('\n3. 数据库时区问题:');
  console.log('   - 数据库时区设置可能不正确');
  console.log('   - 数据库连接时区可能有问题');
  
  console.log('\n4. 历史数据问题:');
  console.log('   - 历史数据可能没有修复');
  console.log('   - 修复脚本可能没有运行');
  
  console.log('\n5. 代码部署问题:');
  console.log('   - 修复后的代码可能没有部署');
  console.log('   - 可能还在使用旧版本的代码');
}

/**
 * 提供解决方案
 */
function provideSolutions() {
  console.log('\n💡 解决方案:');
  console.log('=====================================');
  
  console.log('\n1. 检查前端代码:');
  console.log('   - 确保前端使用 moment-timezone 进行时区转换');
  console.log('   - 确保前端正确显示北京时间');
  
  console.log('\n2. 检查后端代码:');
  console.log('   - 确保后端使用修复后的代码');
  console.log('   - 确保后端正确存储UTC时间');
  
  console.log('\n3. 检查数据库:');
  console.log('   - 检查数据库时区设置');
  console.log('   - 运行历史数据修复脚本');
  
  console.log('\n4. 检查部署:');
  console.log('   - 确保修复后的代码已部署');
  console.log('   - 重启服务以应用修复');
  
  console.log('\n5. 验证修复:');
  console.log('   - 测试新的报餐请求');
  console.log('   - 检查时间显示是否正确');
}

// 主函数
function main() {
  console.log('🔍 报餐系统时间问题调试工具');
  console.log('=====================================');
  console.log('📋 用户反馈: 显示还是早了8个小时');
  console.log('🎯 目标: 找出真正的问题原因');
  console.log('');
  
  try {
    debugTimeIssue();
    analyzePossibleIssues();
    provideSolutions();
    
    console.log('\n🎉 调试分析完成！');
    console.log('请根据分析结果检查具体的问题原因');
  } catch (error) {
    console.error('❌ 调试过程出现错误:', error);
  }
}

// 运行调试
if (require.main === module) {
  main();
}

module.exports = { 
  debugTimeIssue,
  analyzePossibleIssues,
  provideSolutions
};
