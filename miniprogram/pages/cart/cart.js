const { request } = require('../../utils/request');
const { yuan } = require('../../utils/money');

Page({
  data: { items: [], checked: {}, total: 0, totalText: '0.00' },
  onShow() {
    this.load();
  },
  load() {
    request({ url: '/cart' }).then((items) => {
      const checked = {};
      items.forEach((item) => { checked[item.productId] = true; });
      this.setData({
        items: items.map((item) => ({
          ...item,
          priceText: yuan(item.product.price),
          lineTotalText: yuan(item.product.price * item.quantity)
        })),
        checked
      });
      this.calc();
    });
  },
  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ [`checked.${id}`]: !this.data.checked[id] });
    this.calc();
  },
  calc() {
    const total = this.data.items.reduce((sum, item) => (
      this.data.checked[item.productId] ? sum + item.product.price * item.quantity : sum
    ), 0);
    this.setData({ total, totalText: yuan(total) });
  },
  remove(e) {
    const productId = e.currentTarget.dataset.id;
    request({ url: `/cart/${productId}`, method: 'DELETE' })
      .then(() => {
        wx.showToast({ title: '已删除' });
        this.load();
      });
  },
  checkout() {
    const productIds = this.data.items.filter((item) => this.data.checked[item.productId]).map((item) => item.productId);
    if (!productIds.length) return wx.showToast({ title: '请选择商品', icon: 'none' });
    wx.setStorageSync('checkoutIntent', { productIds: productIds.map(String), autoPay: true, from: 'cart' });
    wx.navigateTo({ url: `/pages/address-list/address-list?checkout=1&autoPay=1&productIds=${productIds.join(',')}` });
  }
});
