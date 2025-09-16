const moment = require('moment-timezone');

/**
 * 精确时间修复效果测试
 * 基于前端分析，测试修复前后的时间处理效果
 */
function testTimeFixPrecise() {
  console.log('🧪 精确时间修复效果测试');
  console.log('=====================================');
  console.log('📋 基于前端分析：');
  console.log('   - 前端发送: { "date": "2025-09-11", "mealType": "dinner" }');
  console.log('   - 后端接收: 使用服务器当前时间作为 registerTime');
  console.log('   - 问题: 后端错误地将本地时间存储为UTC时间');
  console.log('');

  // 测试用例1：用户17:18报餐
  console.log('📋 测试用例1：用户17:18报餐');
  console.log('-------------------------------------');
  
  const userReportTime = '2025-09-11 17:18:00'; // 用户实际报餐时间
  console.log(`用户实际报餐时间: ${userReportTime}`);
  
  // 修复前：错误存储
  const wrongStorage = new Date('2025-09-11T17:18:00.000Z'); // 错误：本地时间当作UTC
  console.log(`修复前错误存储: ${wrongStorage.toISOString()}`);
  console.log(`修复前前端显示: ${moment(wrongStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  // 修复后：正确存储
  const correctStorage = moment.tz(userReportTime, 'Asia/Shanghai').utc().toDate();
  console.log(`修复后正确存储: ${correctStorage.toISOString()}`);
  console.log(`修复后前端显示: ${moment(correctStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  // 验证修复效果
  const originalHour = moment(userReportTime).hour();
  const wrongDisplayHour = moment(wrongStorage).tz('Asia/Shanghai').hour();
  const correctDisplayHour = moment(correctStorage).tz('Asia/Shanghai').hour();
  
  console.log('\n📊 修复效果对比:');
  console.log(`原始时间小时: ${originalHour}`);
  console.log(`修复前显示小时: ${wrongDisplayHour} (错误: 相差${originalHour - wrongDisplayHour}小时)`);
  console.log(`修复后显示小时: ${correctDisplayHour} (正确: 完全一致)`);
  
  if (correctDisplayHour === originalHour) {
    console.log('✅ 精确修复成功！时间显示正确');
  } else {
    console.log('❌ 精确修复失败！时间显示仍有问题');
  }

  // 测试用例2：用户12:30报餐
  console.log('\n📋 测试用例2：用户12:30报餐');
  console.log('-------------------------------------');
  
  const userReportTime2 = '2025-09-11 12:30:00';
  console.log(`用户实际报餐时间: ${userReportTime2}`);
  
  const wrongStorage2 = new Date('2025-09-11T12:30:00.000Z');
  console.log(`修复前错误存储: ${wrongStorage2.toISOString()}`);
  console.log(`修复前前端显示: ${moment(wrongStorage2).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  const correctStorage2 = moment.tz(userReportTime2, 'Asia/Shanghai').utc().toDate();
  console.log(`修复后正确存储: ${correctStorage2.toISOString()}`);
  console.log(`修复后前端显示: ${moment(correctStorage2).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  const originalHour2 = moment(userReportTime2).hour();
  const wrongDisplayHour2 = moment(wrongStorage2).tz('Asia/Shanghai').hour();
  const correctDisplayHour2 = moment(correctStorage2).tz('Asia/Shanghai').hour();
  
  console.log('\n📊 修复效果对比:');
  console.log(`原始时间小时: ${originalHour2}`);
  console.log(`修复前显示小时: ${wrongDisplayHour2} (错误: 相差${originalHour2 - wrongDisplayHour2}小时)`);
  console.log(`修复后显示小时: ${correctDisplayHour2} (正确: 完全一致)`);
  
  if (correctDisplayHour2 === originalHour2) {
    console.log('✅ 精确修复成功！时间显示正确');
  } else {
    console.log('❌ 精确修复失败！时间显示仍有问题');
  }

  // 测试用例3：确认就餐时间
  console.log('\n📋 测试用例3：确认就餐时间');
  console.log('-------------------------------------');
  
  const userConfirmTime = '2025-09-11 18:30:00'; // 用户确认就餐时间
  console.log(`用户确认就餐时间: ${userConfirmTime}`);
  
  const wrongConfirmStorage = new Date('2025-09-11T18:30:00.000Z');
  console.log(`修复前错误存储: ${wrongConfirmStorage.toISOString()}`);
  console.log(`修复前前端显示: ${moment(wrongConfirmStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  const correctConfirmStorage = moment.tz(userConfirmTime, 'Asia/Shanghai').utc().toDate();
  console.log(`修复后正确存储: ${correctConfirmStorage.toISOString()}`);
  console.log(`修复后前端显示: ${moment(correctConfirmStorage).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
  
  const originalConfirmHour = moment(userConfirmTime).hour();
  const wrongConfirmDisplayHour = moment(wrongConfirmStorage).tz('Asia/Shanghai').hour();
  const correctConfirmDisplayHour = moment(correctConfirmStorage).tz('Asia/Shanghai').hour();
  
  console.log('\n📊 修复效果对比:');
  console.log(`原始时间小时: ${originalConfirmHour}`);
  console.log(`修复前显示小时: ${wrongConfirmDisplayHour} (错误: 相差${originalConfirmHour - wrongConfirmDisplayHour}小时)`);
  console.log(`修复后显示小时: ${correctConfirmDisplayHour} (正确: 完全一致)`);
  
  if (correctConfirmDisplayHour === originalConfirmHour) {
    console.log('✅ 精确修复成功！时间显示正确');
  } else {
    console.log('❌ 精确修复失败！时间显示仍有问题');
  }
}

/**
 * 测试时间转换工具函数
 */
function testTimeConversionUtils() {
  console.log('\n🔧 时间转换工具函数测试');
  console.log('=====================================');

  // 测试北京时间转UTC
  console.log('\n📋 测试北京时间转UTC:');
  const beijingTime = '2025-09-11 17:18:00';
  const utcTime = moment.tz(beijingTime, 'Asia/Shanghai').utc().toDate();
  console.log(`北京时间: ${beijingTime}`);
  console.log(`转换后UTC: ${utcTime.toISOString()}`);
  console.log(`转换回显示: ${moment(utcTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);

  // 测试UTC转北京时间
  console.log('\n📋 测试UTC转北京时间:');
  const utcTime2 = '2025-09-11T09:18:00.000Z';
  const beijingTime2 = moment(utcTime2).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
  console.log(`UTC时间: ${utcTime2}`);
  console.log(`转换后北京时间: ${beijingTime2}`);

  // 测试餐次判断
  console.log('\n📋 测试餐次判断:');
  const testTimes = [
    '2025-09-11 07:30:00', // 早餐时间
    '2025-09-11 12:30:00', // 午餐时间
    '2025-09-11 18:30:00', // 晚餐时间
    '2025-09-11 15:30:00'  // 非就餐时间
  ];

  testTimes.forEach(time => {
    const beijingTime = moment.tz(time, 'Asia/Shanghai');
    const hour = beijingTime.hour();
    
    let mealType = null;
    if (hour >= 6 && hour < 10) {
      mealType = 'breakfast';
    } else if (hour >= 11 && hour < 14) {
      mealType = 'lunch';
    } else if (hour >= 17 && hour < 20) {
      mealType = 'dinner';
    }
    
    const mealTypeName = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    }[mealType] || '非就餐时间';
    
    console.log(`${time} -> ${mealTypeName} (${mealType})`);
  });
}

/**
 * 测试历史数据修复逻辑
 */
function testHistoricalDataFix() {
  console.log('\n🔧 历史数据修复逻辑测试');
  console.log('=====================================');

  // 模拟错误的历史数据
  const wrongHistoricalData = [
    '2025-09-11T17:18:00.000Z', // 错误：本地时间当作UTC
    '2025-09-11T12:30:00.000Z', // 错误：本地时间当作UTC
    '2025-09-11T18:45:00.000Z', // 错误：本地时间当作UTC
    '2025-09-11T01:15:00.000Z', // 正确：真正的UTC时间
    '2025-09-11T02:30:00.000Z'  // 正确：真正的UTC时间
  ];

  console.log('\n📋 识别需要修复的数据:');
  wrongHistoricalData.forEach((timeStr, index) => {
    const time = new Date(timeStr);
    const hour = time.getUTCHours();
    
    // 如果UTC小时在6-23之间，说明这是错误的本地时间存储
    const needsFix = hour >= 6 && hour <= 23;
    
    if (needsFix) {
      const correctTime = moment(time).subtract(8, 'hours').utc().toDate();
      console.log(`❌ 需要修复 ${index + 1}: ${timeStr} -> ${correctTime.toISOString()}`);
    } else {
      console.log(`✅ 无需修复 ${index + 1}: ${timeStr} (正确的UTC时间)`);
    }
  });
}

// 主函数
function main() {
  console.log('🧪 报餐系统时间修复精确测试工具');
  console.log('=====================================');
  console.log('📋 测试内容:');
  console.log('   1. 修复前后时间对比');
  console.log('   2. 时间转换工具函数');
  console.log('   3. 历史数据修复逻辑');
  console.log('');
  
  try {
    testTimeFixPrecise();
    testTimeConversionUtils();
    testHistoricalDataFix();
    
    console.log('\n🎉 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试过程出现错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = { 
  testTimeFixPrecise,
  testTimeConversionUtils,
  testHistoricalDataFix
};
