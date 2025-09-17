const IOSDateFix = require('../utils/iosDateFix');

/**
 * 测试iOS日期修复功能
 */
function testIOSDateFix() {
  console.log('🧪 开始测试iOS日期修复功能...');
  
  // 测试用例
  const testCases = [
    '2025-09-16T12:49:33.000Z',
    '2025-09-16T12:49:33Z',
    '2025-09-16 12:49:33',
    '2025-09-16',
    new Date(),
    1758028999157,
    null,
    undefined,
    '',
    'invalid-date'
  ];
  
  console.log('\n📋 测试安全创建Date对象...');
  testCases.forEach((testCase, index) => {
    try {
      const result = IOSDateFix.safeCreateDate(testCase);
      console.log(`测试 ${index + 1}: ${JSON.stringify(testCase)} -> ${result ? result.toISOString() : 'null'}`);
    } catch (error) {
      console.log(`测试 ${index + 1}: ${JSON.stringify(testCase)} -> 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试安全格式化时间...');
  const timeFormats = [
    { time: '2025-09-16T12:49:33.000Z', format: 'YYYY-MM-DD HH:mm:ss' },
    { time: '2025-09-16T12:49:33.000Z', format: 'YYYY-MM-DD' },
    { time: new Date(), format: 'YYYY-MM-DD HH:mm:ss' },
    { time: null, format: 'YYYY-MM-DD' }
  ];
  
  timeFormats.forEach((testCase, index) => {
    try {
      const result = IOSDateFix.safeFormatTime(testCase.time, testCase.format);
      console.log(`格式化测试 ${index + 1}: ${JSON.stringify(testCase.time)} -> ${result}`);
    } catch (error) {
      console.log(`格式化测试 ${index + 1}: ${JSON.stringify(testCase.time)} -> 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试UTC转北京时间...');
  const utcTimes = [
    '2025-09-16T12:49:33.000Z',
    '2025-09-16T04:49:33.000Z',
    new Date()
  ];
  
  utcTimes.forEach((utcTime, index) => {
    try {
      const result = IOSDateFix.safeToBeijingTime(utcTime);
      console.log(`UTC转北京时间测试 ${index + 1}: ${JSON.stringify(utcTime)} -> ${result ? result.toISOString() : 'null'}`);
    } catch (error) {
      console.log(`UTC转北京时间测试 ${index + 1}: ${JSON.stringify(utcTime)} -> 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试北京时间转UTC...');
  const beijingTimes = [
    '2025-09-16 20:49:33',
    '2025-09-16T20:49:33',
    new Date()
  ];
  
  beijingTimes.forEach((beijingTime, index) => {
    try {
      const result = IOSDateFix.safeToUTCTime(beijingTime);
      console.log(`北京时间转UTC测试 ${index + 1}: ${JSON.stringify(beijingTime)} -> ${result ? result.toISOString() : 'null'}`);
    } catch (error) {
      console.log(`北京时间转UTC测试 ${index + 1}: ${JSON.stringify(beijingTime)} -> 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试日期有效性检查...');
  const validityTests = [
    '2025-09-16T12:49:33.000Z',
    '2025-09-16',
    'invalid-date',
    null,
    new Date(),
    '2025-13-45' // 无效日期
  ];
  
  validityTests.forEach((testCase, index) => {
    try {
      const result = IOSDateFix.isValidDate(testCase);
      console.log(`有效性测试 ${index + 1}: ${JSON.stringify(testCase)} -> ${result}`);
    } catch (error) {
      console.log(`有效性测试 ${index + 1}: ${JSON.stringify(testCase)} -> 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试日期比较...');
  const comparisonTests = [
    { date1: '2025-09-16T12:49:33.000Z', date2: '2025-09-16T13:49:33.000Z' },
    { date1: '2025-09-16T12:49:33.000Z', date2: '2025-09-16T12:49:33.000Z' },
    { date1: '2025-09-16T13:49:33.000Z', date2: '2025-09-16T12:49:33.000Z' }
  ];
  
  comparisonTests.forEach((testCase, index) => {
    try {
      const result = IOSDateFix.compareDates(testCase.date1, testCase.date2);
      const comparison = result === -1 ? '<' : result === 1 ? '>' : '=';
      console.log(`比较测试 ${index + 1}: ${testCase.date1} ${comparison} ${testCase.date2}`);
    } catch (error) {
      console.log(`比较测试 ${index + 1}: 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试相对时间...');
  const relativeTimeTests = [
    new Date(),
    new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
    new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3天前
  ];
  
  relativeTimeTests.forEach((testCase, index) => {
    try {
      const result = IOSDateFix.getRelativeTime(testCase);
      console.log(`相对时间测试 ${index + 1}: ${testCase.toISOString()} -> ${result}`);
    } catch (error) {
      console.log(`相对时间测试 ${index + 1}: 错误: ${error.message}`);
    }
  });
  
  console.log('\n📋 测试当前北京时间...');
  try {
    const currentBeijingTime = IOSDateFix.getCurrentBeijingTime();
    console.log(`当前北京时间: ${currentBeijingTime.toISOString()}`);
  } catch (error) {
    console.log(`获取当前北京时间失败: ${error.message}`);
  }
  
  console.log('\n🎉 iOS日期修复功能测试完成！');
}

// 运行测试
testIOSDateFix();
