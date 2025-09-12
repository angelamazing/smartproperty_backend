const fs = require('fs');
const path = require('path');

async function createLocalAvatars() {
  try {
    console.log('🎨 创建本地头像文件...');
    
    // 创建public/images/avatars目录
    const avatarsDir = path.join(__dirname, 'public', 'images', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
      console.log('✅ 创建avatars目录:', avatarsDir);
    }
    
    // 创建默认头像SVG文件
    const defaultAvatarSVG = `
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <circle cx="50" cy="35" r="15" fill="white"/>
  <path d="M 20 80 Q 50 60 80 80" stroke="white" stroke-width="3" fill="none"/>
  <text x="50" y="95" text-anchor="middle" fill="white" font-family="Arial" font-size="12">Admin</text>
</svg>`;
    
    const defaultAvatarPath = path.join(avatarsDir, 'default-admin.svg');
    fs.writeFileSync(defaultAvatarPath, defaultAvatarSVG.trim());
    console.log('✅ 创建默认管理员头像:', defaultAvatarPath);
    
    // 创建系统管理员头像
    const sysAdminAvatarSVG = `
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sysBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ee5a24;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#sysBg)"/>
  <circle cx="50" cy="35" r="15" fill="white"/>
  <path d="M 20 80 Q 50 60 80 80" stroke="white" stroke-width="3" fill="none"/>
  <text x="50" y="95" text-anchor="middle" fill="white" font-family="Arial" font-size="10">SysAdmin</text>
</svg>`;
    
    const sysAdminAvatarPath = path.join(avatarsDir, 'sys-admin.svg');
    fs.writeFileSync(sysAdminAvatarPath, sysAdminAvatarSVG.trim());
    console.log('✅ 创建系统管理员头像:', sysAdminAvatarPath);
    
    // 创建部门管理员头像
    const deptAdminAvatarSVG = `
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="deptBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4ecdc4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#44a08d;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#deptBg)"/>
  <circle cx="50" cy="35" r="15" fill="white"/>
  <path d="M 20 80 Q 50 60 80 80" stroke="white" stroke-width="3" fill="none"/>
  <text x="50" y="95" text-anchor="middle" fill="white" font-family="Arial" font-size="10">DeptAdmin</text>
</svg>`;
    
    const deptAdminAvatarPath = path.join(avatarsDir, 'dept-admin.svg');
    fs.writeFileSync(deptAdminAvatarPath, deptAdminAvatarSVG.trim());
    console.log('✅ 创建部门管理员头像:', deptAdminAvatarPath);
    
    // 创建普通用户头像
    const userAvatarSVG = `
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="userBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a8edea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fed6e3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#userBg)"/>
  <circle cx="50" cy="35" r="15" fill="white"/>
  <path d="M 20 80 Q 50 60 80 80" stroke="white" stroke-width="3" fill="none"/>
  <text x="50" y="95" text-anchor="middle" fill="white" font-family="Arial" font-size="10">User</text>
</svg>`;
    
    const userAvatarPath = path.join(avatarsDir, 'user.svg');
    fs.writeFileSync(userAvatarPath, userAvatarSVG.trim());
    console.log('✅ 创建普通用户头像:', userAvatarPath);
    
    // 创建头像索引文件
    const avatarIndex = {
      default: '/images/avatars/default-admin.svg',
      sysAdmin: '/images/avatars/sys-admin.svg',
      deptAdmin: '/images/avatars/dept-admin.svg',
      user: '/images/avatars/user.svg'
    };
    
    const avatarIndexPath = path.join(avatarsDir, 'index.json');
    fs.writeFileSync(avatarIndexPath, JSON.stringify(avatarIndex, null, 2));
    console.log('✅ 创建头像索引文件:', avatarIndexPath);
    
    console.log('\n🎉 本地头像文件创建完成！');
    console.log('头像文件位置:', avatarsDir);
    console.log('可以在前端使用以下路径:');
    console.log('  - 默认头像: /images/avatars/default-admin.svg');
    console.log('  - 系统管理员: /images/avatars/sys-admin.svg');
    console.log('  - 部门管理员: /images/avatars/dept-admin.svg');
    console.log('  - 普通用户: /images/avatars/user.svg');
    
  } catch (error) {
    console.error('❌ 创建头像文件失败:', error.message);
  }
}

// 运行创建脚本
createLocalAvatars();
