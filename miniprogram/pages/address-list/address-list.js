const { request } = require('../../utils/request');

Page({
  data: { list: [], checkout: false, productId: '', productIds: [], autoPay: false, submitting: false },
  onLoad(query) {
    const intent = wx.getStorageSync('checkoutIntent') || {};
    const productIds = query.productIds ? query.productIds.split(',').filter(Boolean) : (intent.productIds || []);
    this.setData({
      checkout: query.checkout === '1' || Boolean(productIds.length),
      productId: String(query.productId || intent.productId || productIds[0] || ''),
      productIds: productIds.map(String),
      autoPay: query.autoPay === '1' || intent.autoPay === true
    });
  },
  onShow() {
    this.load();
  },
  load() {
    request({ url: '/addresses' }).then((list) => this.setData({ list }));
  },
  add() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },
  remove(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除地址',
      content: '确定删除这个地址吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return;
        request({ url: `/addresses/${id}`, method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除' });
          this.load();
        });
      }
    });
  },
  choose(e) {
    if (!this.data.checkout) return;
    if (!this.data.productIds.length) return wx.showToast({ title: '缺少结算商品', icon: 'none' });
    if (this.data.submitting) return;
    const addressId = e.currentTarget.dataset.id || (this.data.list[0] && this.data.list[0].id);
    if (!addressId) return wx.showToast({ title: '请选择地址', icon: 'none' });
    this.setData({ submitting: true });
    wx.showLoading({ title: '结算中' });
    const useDirect = this.data.autoPay && this.data.productId;
    const url = useDirect ? '/orders/direct-checkout' : (this.data.autoPay ? '/orders/checkout' : '/orders');
    const data = useDirect
      ? { addressId: String(addressId), productId: String(this.data.productId) }
      : { addressId: String(addressId), productIds: this.data.productIds.map(String) };
    request({ url, method: 'POST', data })
      .then((order) => {
        wx.hideLoading();
        wx.removeStorageSync('checkoutIntent');
        this.setData({ submitting: false });
        wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${order.id}` });
      })
      .catch((error) => {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showToast({ title: error && error.message ? error.message : '结算失败', icon: 'none' });
      });
  }
});
