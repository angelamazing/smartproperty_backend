const fs = require('fs');
const path = require('path');

/**
 * 业务逻辑时间修复脚本
 * 修复所有业务逻辑中的时区处理问题
 */

// 需要修复的文件列表
const filesToFix = [
  'utils/common.js',
  'services/diningService.js',
  'services/diningServiceEnhanced.js',
  'services/diningConfirmationService.js',
  'services/qrScanService.js',
  'controllers/diningController.js',
  'controllers/diningControllerEnhanced.js'
];

// 修复规则
const fixRules = [
  {
    // 修复普通moment导入
    pattern: /const moment = require\('moment'\);/g,
    replacement: "const moment = require('moment-timezone');"
  },
  {
    // 修复时间验证逻辑
    pattern: /const diningMoment = moment\(diningDate\);/g,
    replacement: "const diningMoment = moment(diningDate).tz('Asia/Shanghai');"
  },
  {
    // 修复当前时间获取
    pattern: /const now = moment\(\);/g,
    replacement: "const now = moment().tz('Asia/Shanghai');"
  },
  {
    // 修复时间存储逻辑
    pattern: /const actualDiningTime = now\.format\('YYYY-MM-DD HH:mm:ss'\);/g,
    replacement: "const utcActualDiningTime = now.utc().toDate();"
  },
  {
    // 修复数据库更新语句
    pattern: /\[actualDiningTime, orderId\]/g,
    replacement: "[utcActualDiningTime, orderId]"
  }
];

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // 应用修复规则
    fixRules.forEach(rule => {
      if (rule.pattern.test(content)) {
        content = content.replace(rule.pattern, rule.replacement);
        modified = true;
        console.log(`✅ 修复 ${filePath}: ${rule.pattern}`);
      }
    });
    
    // 如果文件被修改，写回文件
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`📝 已更新文件: ${filePath}`);
      return true;
    } else {
      console.log(`✅ 文件无需修复: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 修复所有业务逻辑文件
 */
function fixAllBusinessLogic() {
  console.log('🔧 开始修复业务逻辑时间处理...');
  console.log('=====================================');
  
  let fixedCount = 0;
  let totalCount = filesToFix.length;
  
  filesToFix.forEach(filePath => {
    console.log(`\n📋 处理文件: ${filePath}`);
    if (fixFile(filePath)) {
      fixedCount++;
    }
  });
  
  console.log('\n📊 修复统计:');
  console.log(`总文件数: ${totalCount}`);
  console.log(`修复文件数: ${fixedCount}`);
  console.log(`无需修复: ${totalCount - fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n✅ 业务逻辑时间修复完成！');
    console.log('⚠️  请检查修复后的代码，确保业务逻辑正确');
  } else {
    console.log('\n✅ 所有文件都已使用正确的时间处理！');
  }
}

/**
 * 验证修复结果
 */
function verifyFix() {
  console.log('\n🔍 验证修复结果...');
  console.log('=====================================');
  
  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // 检查是否使用了正确的moment导入
    if (content.includes("require('moment-timezone')")) {
      console.log(`✅ ${filePath}: 使用正确的moment-timezone`);
    } else if (content.includes("require('moment')")) {
      console.log(`❌ ${filePath}: 仍在使用普通moment`);
    }
    
    // 检查是否使用了正确的时区处理
    if (content.includes(".tz('Asia/Shanghai')")) {
      console.log(`✅ ${filePath}: 使用正确的时区处理`);
    } else {
      console.log(`⚠️  ${filePath}: 可能缺少时区处理`);
    }
  });
}

/**
 * 创建修复后的示例代码
 */
function createFixedExamples() {
  console.log('\n📝 创建修复后的示例代码...');
  console.log('=====================================');
  
  const examples = {
    'utils/common.js': `
const moment = require('moment-timezone');

class CommonUtils {
  static validateDiningTime(diningDate, mealType, allowFlexible = false) {
    const diningMoment = moment(diningDate).tz('Asia/Shanghai');
    const now = moment().tz('Asia/Shanghai');

    if (diningMoment.isSame(now, 'day')) {
      const mealTimeRanges = {
        'breakfast': { start: 6, end: 10 },
        'lunch': { start: 11, end: 14 },
        'dinner': { start: 17, end: 20 }
      };

      const range = mealTimeRanges[mealType];
      if (range) {
        const currentHour = now.hour();
        
        if (!allowFlexible && (currentHour < range.start || currentHour > range.end)) {
          throw new BusinessError(
            \`不在\${this.getMealTypeName(mealType)}时间范围内（\${range.start}:00-\${range.end}:00）\`,
            ERROR_CODES.INVALID_DINING_TIME
          );
        }
      }
    }
  }
}`,
    
    'services/diningConfirmationService.js': `
const moment = require('moment-timezone');

class DiningConfirmationService {
  async confirmDiningManually(userId, orderId, confirmationType = 'manual', db) {
    const diningDate = moment(order.diningDate).tz('Asia/Shanghai');
    const now = moment().tz('Asia/Shanghai');
    
    if (diningDate.isSame(now, 'day')) {
      const mealType = order.mealType;
      const currentHour = now.hour();
      
      const mealTimeRanges = {
        'breakfast': { start: 6, end: 10 },
        'lunch': { start: 11, end: 14 },
        'dinner': { start: 17, end: 20 }
      };
      
      const timeRange = mealTimeRanges[mealType];
      if (timeRange && (currentHour < timeRange.start || currentHour > timeRange.end)) {
        throw new Error(\`当前时间不在\${this.getMealTypeName(mealType)}就餐时间内\`);
      }
    }

    const utcActualDiningTime = now.utc().toDate();
    
    await connection.execute(
      \`UPDATE dining_orders 
       SET diningStatus = 'dined', 
           actualDiningTime = ?,
           updateTime = NOW()
       WHERE _id = ?\`,
      [utcActualDiningTime, orderId]
    );
  }
}`
  };
  
  Object.entries(examples).forEach(([fileName, code]) => {
    const filePath = path.join(__dirname, `fixed_${fileName}`);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`📝 创建示例文件: fixed_${fileName}`);
  });
}

// 主函数
function main() {
  console.log('🔧 报餐系统业务逻辑时间修复工具');
  console.log('=====================================');
  console.log('📋 修复内容:');
  console.log('   1. 修复moment导入（使用moment-timezone）');
  console.log('   2. 修复时间验证逻辑（使用北京时间）');
  console.log('   3. 修复时间存储逻辑（存储UTC时间）');
  console.log('   4. 修复业务规则判断（基于北京时间）');
  console.log('');
  
  try {
    fixAllBusinessLogic();
    verifyFix();
    createFixedExamples();
    
    console.log('\n🎉 业务逻辑时间修复完成！');
    console.log('⚠️  请检查修复后的代码，确保业务逻辑正确');
  } catch (error) {
    console.error('❌ 修复过程出现错误:', error);
  }
}

// 运行修复脚本
if (require.main === module) {
  main();
}

module.exports = { 
  fixAllBusinessLogic,
  verifyFix,
  createFixedExamples
};
