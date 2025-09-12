// 微信小程序主入口
App({
  onLaunch() {
    console.log('小程序启动');
    
    // 检查更新
    this.checkForUpdate();
  },

  onShow() {
    console.log('小程序显示');
  },

  onHide() {
    console.log('小程序隐藏');
  },

  onError(error) {
    console.error('小程序错误:', error);
  },

  /**
   * 检查小程序更新
   */
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      
      updateManager.onUpdateFailed(() => {
        console.error('新版本下载失败');
      });
    }
  },

  /**
   * 全局数据
   */
  globalData: {
    userInfo: null,
    token: null,
    baseURL: 'https://your-domain.com' // 替换为实际的后端域名
  }
});
