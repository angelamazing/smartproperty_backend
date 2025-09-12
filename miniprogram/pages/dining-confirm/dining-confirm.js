// 微信小程序 - 用餐确认页面
Page({
  data: {
    qrCode: '',
    userInfo: null,
    isLoggedIn: false,
    scanResult: null,
    loading: false
  },

  onLoad(options) {
    // 获取二维码参数
    const { qrCode } = options;
    this.setData({ qrCode });
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    // 页面显示时检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      
      // 如果已登录，自动确认就餐
      this.confirmDining();
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null
      });
    }
  },

  /**
   * 微信登录
   */
  async wechatLogin() {
    try {
      this.setData({ loading: true });
      
      // 获取微信授权码
      const { code } = await wx.login();
      
      // 获取用户信息
      const { encryptedData, iv } = await wx.getUserProfile({
        desc: '用于确认用餐身份'
      });
      
      // 调用后端登录接口
      const response = await wx.request({
        url: 'https://your-domain.com/api/auth/wechat-login',
        method: 'POST',
        data: { 
          code, 
          encryptedData, 
          iv 
        }
      });
      
      const result = response.data;
      
      if (result.success) {
        // 保存用户信息
        wx.setStorageSync('token', result.data.token);
        wx.setStorageSync('userInfo', result.data.userInfo);
        
        this.setData({
          isLoggedIn: true,
          userInfo: result.data.userInfo
        });
        
        // 登录成功后自动确认就餐
        this.confirmDining();
      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 确认就餐
   */
  async confirmDining() {
    try {
      this.setData({ loading: true });
      
      const token = wx.getStorageSync('token');
      const scanTime = new Date().toISOString();
      
      // 调用后端确认就餐接口
      const response = await wx.request({
        url: 'https://your-domain.com/api/qr-scan/wechat-scan',
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          qrCode: this.data.qrCode,
          scanTime: scanTime
        }
      });
      
      const result = response.data;
      
      if (result.success) {
        this.setData({
          scanResult: {
            success: true,
            message: result.message,
            data: result.data
          }
        });
        
        wx.showToast({
          title: '确认成功！',
          icon: 'success'
        });
      } else {
        this.setData({
          scanResult: {
            success: false,
            message: result.message
          }
        });
        
        wx.showToast({
          title: result.message || '确认失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('确认就餐失败:', error);
      wx.showToast({
        title: '确认失败，请重试',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 重新确认
   */
  retryConfirm() {
    this.setData({ scanResult: null });
    this.confirmDining();
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
