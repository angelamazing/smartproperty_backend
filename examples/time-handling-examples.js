/**
 * 时间处理示例和测试用例
 * 演示如何正确使用统一时间处理方案
 */

const moment = require('moment-timezone');
const TimeUtils = require('../utils/timeUtils');

console.log('🕐 时间处理示例和测试用例');
console.log('=====================================');

// 测试用例1：后端时间处理
console.log('\n📋 测试用例1：后端时间处理');
console.log('-------------------------------------');

// 1.1 获取当前北京时间
const beijingTime = TimeUtils.getBeijingTime();
console.log(`当前北京时间: ${beijingTime.format('YYYY-MM-DD HH:mm:ss')}`);

// 1.2 将北京时间转换为UTC时间存储
const beijingTimeStr = '2024-01-15 18:30:00';
const utcTime = TimeUtils.toUTCForStorage(beijingTimeStr);
console.log(`北京时间 ${beijingTimeStr} 转换为UTC存储: ${utcTime.toISOString()}`);

// 1.3 将UTC时间转换为北京时间显示
const utcTimeStr = '2024-01-15T10:30:00.000Z';
const beijingDisplay = TimeUtils.toBeijingForDisplay(utcTimeStr);
console.log(`UTC时间 ${utcTimeStr} 转换为北京时间显示: ${beijingDisplay}`);

// 1.4 餐次时间检查
console.log('\n🍽️ 餐次时间检查:');
const testTimes = [
  { time: '2024-01-15 07:30:00', expected: 'breakfast' },
  { time: '2024-01-15 12:30:00', expected: 'lunch' },
  { time: '2024-01-15 18:30:00', expected: 'dinner' },
  { time: '2024-01-15 15:30:00', expected: null }
];

testTimes.forEach(({ time, expected }) => {
  const mealType = TimeUtils.getMealTypeByTime(time);
  const isCorrect = mealType === expected;
  console.log(`时间 ${time} -> 餐次: ${mealType || '无'} ${isCorrect ? '✅' : '❌'}`);
  if (!isCorrect) {
    console.log(`  调试信息: 小时数 = ${moment(time).tz('Asia/Shanghai').hour()}`);
  }
});

// 测试用例2：API接口时间格式
console.log('\n📋 测试用例2：API接口时间格式');
console.log('-------------------------------------');

// 2.1 后端返回给前端的时间格式
const apiResponse = {
  orderId: 'test-order-123',
  createTime: TimeUtils.toISOString(new Date()),
  updateTime: TimeUtils.toISOString(new Date()),
  diningDate: '2024-01-15',
  mealType: 'dinner'
};

console.log('后端API返回格式:');
console.log(JSON.stringify(apiResponse, null, 2));

// 2.2 前端提交给后端的时间格式
const frontendSubmit = {
  eventTime: TimeUtils.toUTCForStorage('2024-01-15 18:30:00').toISOString(),
  deadline: TimeUtils.toUTCForStorage('2024-01-20 18:00:00').toISOString()
};

console.log('\n前端提交格式:');
console.log(JSON.stringify(frontendSubmit, null, 2));

// 测试用例3：业务场景测试
console.log('\n📋 测试用例3：业务场景测试');
console.log('-------------------------------------');

// 3.1 报餐时间验证
const testDiningScenarios = [
  { date: '2024-01-15', mealType: 'dinner', canOrder: true, reason: '今天晚餐' },
  { date: '2024-01-14', mealType: 'dinner', canOrder: false, reason: '昨天晚餐' },
  { date: '2024-01-16', mealType: 'dinner', canOrder: true, reason: '明天晚餐' }
];

testDiningScenarios.forEach(({ date, mealType, canOrder, reason }) => {
  const canRegister = TimeUtils.canRegisterMeal(date);
  const isCorrect = canRegister === canOrder;
  console.log(`${reason}: ${canRegister ? '可以报餐' : '不能报餐'} ${isCorrect ? '✅' : '❌'}`);
});

// 3.2 确认就餐时间验证
const testConfirmationScenarios = [
  { date: '2024-01-15', mealType: 'dinner', time: '18:30', canConfirm: true, reason: '晚餐时间' },
  { date: '2024-01-15', mealType: 'breakfast', time: '18:30', canConfirm: false, reason: '非早餐时间' },
  { date: '2024-01-14', mealType: 'dinner', time: '18:30', canConfirm: false, reason: '昨天' }
];

testConfirmationScenarios.forEach(({ date, mealType, time, canConfirm, reason }) => {
  const canConfirmDining = TimeUtils.canConfirmDining(date, mealType);
  const isCorrect = canConfirmDining === canConfirm;
  console.log(`${reason}: ${canConfirmDining ? '可以确认' : '不能确认'} ${isCorrect ? '✅' : '❌'}`);
});

// 测试用例4：时间格式化测试
console.log('\n📋 测试用例4：时间格式化测试');
console.log('-------------------------------------');

const testTime = '2024-01-15T10:30:00.000Z';
const formats = [
  { format: 'YYYY-MM-DD HH:mm:ss', desc: '完整时间' },
  { format: 'YYYY-MM-DD', desc: '仅日期' },
  { format: 'HH:mm:ss', desc: '仅时间' },
  { format: 'MM-DD HH:mm', desc: '月日时分' }
];

formats.forEach(({ format, desc }) => {
  const formatted = TimeUtils.formatTime(testTime, format);
  console.log(`${desc} (${format}): ${formatted}`);
});

// 测试用例5：相对时间测试
console.log('\n📋 测试用例5：相对时间测试');
console.log('-------------------------------------');

const now = TimeUtils.getBeijingTime();
const relativeTimes = [
  { minutes: 5, desc: '5分钟前' },
  { minutes: 30, desc: '30分钟前' },
  { hours: 2, desc: '2小时前' },
  { days: 1, desc: '1天前' }
];

relativeTimes.forEach(({ minutes = 0, hours = 0, days = 0, desc }) => {
  const testTime = now.clone().subtract({ minutes, hours, days });
  const relative = TimeUtils.getTimeDiffDescription(testTime.toDate());
  console.log(`${desc}: ${relative}`);
});

console.log('\n✅ 时间处理示例测试完成！');
console.log('=====================================');
