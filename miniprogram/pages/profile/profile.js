Page({
  data: { logged: !!wx.getStorageSync('token') },
  onShow() {
    this.setData({
      logged: !!wx.getStorageSync('token')
    });
  },
  login() {
    getApp().login().then(() => this.setData({ logged: true }));
  },
  addresses() {
    wx.navigateTo({ url: '/pages/address-list/address-list' });
  }
});
