App({
  globalData: {
    token: wx.getStorageSync('token') || ''
  },
  onLaunch() {
    if (!this.globalData.token) {
      this.login().catch(() => undefined);
    }
  },
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: ({ code }) => {
          const { request } = require('./utils/request');
          request({ url: '/auth/wechat-login', method: 'POST', data: { code } })
            .then((res) => {
              wx.setStorageSync('token', res.token);
              this.globalData.token = res.token;
              resolve(res);
            })
            .catch(reject);
        },
        fail: reject
      });
    });
  }
});
