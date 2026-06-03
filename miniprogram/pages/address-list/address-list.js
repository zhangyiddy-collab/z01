const { request } = require('../../utils/request');

Page({
  data: {
    list: [],
    checkout: false,
    productId: '',
    productIds: [],
    selectedAddressId: '',
    autoPay: false,
    from: '',
    quantity: 1,
    remark: '',
    submitting: false
  },
  onLoad(query) {
    const intent = wx.getStorageSync('checkoutIntent') || {};
    const productIds = query.productIds ? query.productIds.split(',').filter(Boolean) : (intent.productIds || []);
    const from = String(query.from || intent.from || '');
    this.setData({
      checkout: query.checkout === '1' || Boolean(productIds.length),
      productId: String(query.productId || intent.productId || productIds[0] || ''),
      productIds: productIds.map(String),
      autoPay: query.autoPay === '1' || intent.autoPay === true,
      from,
      quantity: Math.max(1, Number(query.quantity || intent.quantity || 1) || 1),
      remark: String(intent.remark || wx.getStorageSync('orderRemark') || '')
    });
  },
  onShow() {
    this.load();
  },
  load() {
    request({ url: '/addresses' }).then((list) => {
      const selectedAddressId = this.data.selectedAddressId && list.some((item) => String(item.id) === String(this.data.selectedAddressId))
        ? this.data.selectedAddressId
        : (list[0] && String(list[0].id)) || '';
      this.setData({ list, selectedAddressId });
    });
  },
  add() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },
  selectAddress(e) {
    if (!this.data.checkout) return;
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ selectedAddressId: String(id) });
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
  submitCheckout() {
    if (!this.data.checkout) return;
    if (!this.data.productIds.length) return wx.showToast({ title: '缺少结算商品', icon: 'none' });
    if (this.data.submitting) return;
    const addressId = this.data.selectedAddressId;
    if (!addressId) return wx.showToast({ title: '请选择地址', icon: 'none' });
    this.setData({ submitting: true });
    wx.showLoading({ title: '结算中' });
    const remark = String(this.data.remark || '').trim();
    wx.setStorageSync('orderRemark', remark);
    const useDirect = this.data.autoPay && this.data.from === 'product' && this.data.productId && this.data.productIds.length === 1;
    const url = useDirect ? '/orders/direct-checkout' : (this.data.autoPay ? '/orders/checkout' : '/orders');
    const data = useDirect
      ? { addressId: String(addressId), productId: String(this.data.productId), quantity: this.data.quantity, remark }
      : { addressId: String(addressId), productIds: this.data.productIds.map(String), remark };
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
  },
  choose(e) {
    this.selectAddress(e);
  }
});
