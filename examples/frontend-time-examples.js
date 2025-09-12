/**
 * 前端时间处理示例
 * 演示如何在前端正确使用时间处理工具类
 */

// 模拟前端环境（实际使用时需要安装dayjs）
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// import 'dayjs/locale/zh-cn';
// import { TimeUtils } from '../utils/frontendTimeUtils';

// 这里使用模拟的TimeUtils类来演示
class MockTimeUtils {
  static formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!time) return '';
    const date = new Date(time);
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  static getRelativeTime(time) {
    if (!time) return '';
    const now = new Date();
    const target = new Date(time);
    const diff = now - target;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return this.formatTime(time, 'YYYY-MM-DD');
  }

  static toUTCForSubmit(beijingTime) {
    if (!beijingTime) return '';
    const date = new Date(beijingTime);
    return new Date(date.getTime() - 8 * 60 * 60 * 1000).toISOString();
  }

  static getCurrentDate() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString().split('T')[0];
  }

  static getCurrentTime() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString().split('T')[1].substring(0, 5);
  }

  static isValidTime(timeString) {
    return !isNaN(new Date(timeString).getTime());
  }
}

console.log('🕐 前端时间处理示例');
console.log('=====================================');

// 示例1：Vue组件中的使用
console.log('\n📋 示例1：Vue组件中的使用');
console.log('-------------------------------------');

// 模拟从后端接收的数据
const apiResponse = {
  orderId: 'order-123',
  createTime: '2024-01-15T10:30:00.000Z', // UTC时间
  updateTime: '2024-01-15T14:25:30.500Z', // UTC时间
  diningDate: '2024-01-15',
  mealType: 'dinner'
};

console.log('后端返回的原始数据:');
console.log(JSON.stringify(apiResponse, null, 2));

// 在Vue模板中格式化显示
console.log('\nVue模板中的格式化显示:');
console.log(`创建时间: ${MockTimeUtils.formatTime(apiResponse.createTime, 'YYYY-MM-DD HH:mm')}`);
console.log(`更新时间: ${MockTimeUtils.getRelativeTime(apiResponse.updateTime)}`);

// 示例2：表单提交
console.log('\n📋 示例2：表单提交');
console.log('-------------------------------------');

// 用户在前端选择的时间
const userSelectedDate = '2024-01-15';
const userSelectedTime = '18:30';

// 组合成完整的日期时间
const localDateTime = `${userSelectedDate} ${userSelectedTime}:00`;
console.log(`用户选择的本地时间: ${localDateTime}`);

// 转换为UTC时间提交给后端
const utcDateTime = MockTimeUtils.toUTCForSubmit(localDateTime);
console.log(`转换为UTC时间提交: ${utcDateTime}`);

// 示例3：时间范围选择
console.log('\n📋 示例3：时间范围选择');
console.log('-------------------------------------');

// 用户选择的时间范围
const dateRange = [
  '2024-01-15T08:00:00.000Z', // 开始时间
  '2024-01-15T20:00:00.000Z'  // 结束时间
];

console.log('时间范围选择:');
console.log(`开始时间: ${MockTimeUtils.formatTime(dateRange[0], 'YYYY-MM-DD HH:mm')}`);
console.log(`结束时间: ${MockTimeUtils.formatTime(dateRange[1], 'YYYY-MM-DD HH:mm')}`);

// 示例4：表格显示
console.log('\n📋 示例4：表格显示');
console.log('-------------------------------------');

const tableData = [
  {
    id: 1,
    orderId: 'order-001',
    createTime: '2024-01-15T10:30:00.000Z',
    updateTime: '2024-01-15T14:25:30.500Z',
    status: 'pending'
  },
  {
    id: 2,
    orderId: 'order-002',
    createTime: '2024-01-15T11:15:00.000Z',
    updateTime: '2024-01-15T15:10:20.300Z',
    status: 'confirmed'
  }
];

console.log('表格数据格式化:');
tableData.forEach((row, index) => {
  console.log(`\n订单 ${index + 1}:`);
  console.log(`  订单ID: ${row.orderId}`);
  console.log(`  创建时间: ${MockTimeUtils.formatTime(row.createTime, 'YYYY-MM-DD HH:mm')}`);
  console.log(`  更新时间: ${MockTimeUtils.getRelativeTime(row.updateTime)}`);
  console.log(`  状态: ${row.status}`);
});

// 示例5：时间验证
console.log('\n📋 示例5：时间验证');
console.log('-------------------------------------');

const validationTests = [
  { time: '2024-01-15T10:30:00.000Z', valid: true, desc: '有效UTC时间' },
  { time: '2024-01-15 18:30:00', valid: true, desc: '有效本地时间' },
  { time: 'invalid-time', valid: false, desc: '无效时间' },
  { time: '', valid: false, desc: '空时间' }
];

validationTests.forEach(({ time, valid, desc }) => {
  const isValid = MockTimeUtils.isValidTime(time);
  const isCorrect = isValid === valid;
  console.log(`${desc}: ${isValid ? '有效' : '无效'} ${isCorrect ? '✅' : '❌'}`);
});

// 示例6：当前时间获取
console.log('\n📋 示例6：当前时间获取');
console.log('-------------------------------------');

console.log(`当前日期: ${MockTimeUtils.getCurrentDate()}`);
console.log(`当前时间: ${MockTimeUtils.getCurrentTime()}`);

// 示例7：React Hook使用示例
console.log('\n📋 示例7：React Hook使用示例');
console.log('-------------------------------------');

const useTimeExample = `
// hooks/useTime.js
import { useMemo } from 'react';
import { TimeUtils } from '@/utils/TimeUtils';

export const useTime = () => {
  const formatTime = useMemo(() => {
    return (time, format) => TimeUtils.formatTime(time, format);
  }, []);

  const getRelativeTime = useMemo(() => {
    return (time) => TimeUtils.getRelativeTime(time);
  }, []);

  return {
    formatTime,
    getRelativeTime,
    getCurrentDate: TimeUtils.getCurrentDate,
    getCurrentTime: TimeUtils.getCurrentTime,
    toUTCForSubmit: TimeUtils.toUTCForSubmit
  };
};

// 在组件中使用
const TimeDisplay = ({ item }) => {
  const { formatTime, getRelativeTime } = useTime();

  return (
    <div>
      <p>创建时间: {formatTime(item.createTime, 'YYYY-MM-DD HH:mm')}</p>
      <p>更新时间: {getRelativeTime(item.updateTime)}</p>
    </div>
  );
};
`;

console.log('React Hook使用示例:');
console.log(useTimeExample);

console.log('\n✅ 前端时间处理示例完成！');
console.log('=====================================');
