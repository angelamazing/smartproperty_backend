const fs = require('fs');
const path = require('path');

// 需要修复的字段名映射
const fieldMappings = {
  // 用户表字段
  'real_name': 'nickName',
  'phone_number': 'phoneNumber',
  'department_id': 'departmentId',
  'create_time': 'createTime',
  'update_time': 'updateTime',
  'last_login_time': 'lastLoginTime',
  'is_test_user': 'isTestUser',
  'is_admin_test': 'isAdminTest',
  'is_sys_admin_test': 'isSysAdminTest',
  
  // 部门表字段
  'manager_id': 'managerId',
  'parent_id': 'parentId',
  
  // 菜单表字段
  'meal_type': 'mealType',
  'meal_time': 'mealTime',
  'publish_status': 'publishStatus',
  'publish_date': 'publishDate',
  'admin_id': 'publisherId',
  
  // 菜品表字段
  'category_id': 'categoryId',
  'is_recommended': 'isRecommended',
  
  // 场地表字段
  'venue_id': 'venueId',
  
  // 预约表字段
  'user_id': 'userId',
  'time_slot_id': 'timeSlotId',
  'total_price': 'totalPrice',
  
  // 时间段表字段
  'start_time': 'startTime',
  'end_time': 'endTime',
  
  // 通用字段
  'create_by': 'createBy',
  'update_by': 'updateBy'
};

// 需要修复的文件
const filesToFix = [
  'services/adminService.js',
  'controllers/adminController.js',
  'middleware/auth.js',
  'middleware/adminAuth.js'
];

function fixFile(filePath) {
  console.log(`\n🔧 修复文件: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixedCount = 0;
  
  // 应用所有字段名修复
  for (const [oldField, newField] of Object.entries(fieldMappings)) {
    // 修复SQL查询中的字段名
    const sqlPattern = new RegExp(`\\b${oldField}\\b`, 'g');
    if (content.match(sqlPattern)) {
      content = content.replace(sqlPattern, newField);
      fixedCount++;
      console.log(`  ✅ 修复: ${oldField} → ${newField}`);
    }
  }
  
  // 修复表别名引用
  const aliasPatterns = [
    { old: 'u\\.real_name', new: 'u.nickName' },
    { old: 'u\\.phone_number', new: 'u.phoneNumber' },
    { old: 'u\\.department_id', new: 'u.departmentId' },
    { old: 'd\\.manager_id', new: 'd.managerId' },
    { old: 'd\\.parent_id', new: 'd.parentId' },
    { old: 'm\\.admin_id', new: 'm.publisherId' },
    { old: 'r\\.user_id', new: 'r.userId' },
    { old: 'r\\.venue_id', new: 'r.venueId' },
    { old: 'ts\\.venue_id', new: 'ts.venueId' }
  ];
  
  for (const pattern of aliasPatterns) {
    const regex = new RegExp(pattern.old, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, pattern.new);
      fixedCount++;
      console.log(`  ✅ 修复别名: ${pattern.old} → ${pattern.new}`);
    }
  }
  
  // 修复表名引用
  const tablePatterns = [
    { old: 'FROM users u', new: 'FROM users u' },
    { old: 'FROM departments d', new: 'FROM departments d' },
    { old: 'FROM menus m', new: 'FROM menus m' },
    { old: 'FROM dishes d', new: 'FROM dishes d' },
    { old: 'FROM venues v', new: 'FROM venues v' },
    { old: 'FROM reservations r', new: 'FROM reservations r' },
    { old: 'FROM time_slots ts', new: 'FROM time_slots ts' }
  ];
  
  for (const pattern of tablePatterns) {
    if (content.includes(pattern.old)) {
      console.log(`  ✅ 表别名已正确: ${pattern.old}`);
    }
  }
  
  if (fixedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  📝 已修复 ${fixedCount} 个字段名问题`);
  } else {
    console.log(`  ✅ 无需修复`);
  }
}

// 主修复流程
console.log('🚀 开始全面修复字段名问题...');
console.log('=' * 50);

for (const file of filesToFix) {
  fixFile(file);
}

console.log('\n' + '=' * 50);
console.log('🎉 字段名修复完成！');
console.log('\n📋 修复总结:');
console.log('1. 用户表字段: real_name → nickName, phone_number → phoneNumber');
console.log('2. 部门表字段: manager_id → managerId, parent_id → parentId');
console.log('3. 菜单表字段: admin_id → publisherId, meal_type → mealType');
console.log('4. 菜品表字段: category_id → categoryId');
console.log('5. 场地表字段: venue_id → venueId');
console.log('6. 预约表字段: user_id → userId');
console.log('7. 时间字段: create_time → createTime, update_time → updateTime');
console.log('\n💡 建议: 重启服务器以确保修复生效');
