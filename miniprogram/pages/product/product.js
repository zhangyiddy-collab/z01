const { request } = require('../../utils/request');
const { yuan } = require('../../utils/money');

Page({
  data: { id: '', product: null, quantity: 1 },
  onLoad(query) {
    this.setData({ id: query.id });
    this.load();
  },
  load() {
    request({ url: `/products/${this.data.id}` })
      .then((product) => this.setData({ product: { ...product, priceText: yuan(product.price) } }));
  },
  inc() {
    this.setData({ quantity: this.data.quantity + 1 });
  },
  dec() {
    this.setData({ quantity: Math.max(1, this.data.quantity - 1) });
  },
  addCart() {
    request({ url: '/cart', method: 'POST', data: { productId: this.data.id, quantity: this.data.quantity } })
      .then(() => wx.showToast({ title: '已加入购物车' }));
  },
  buyNow() {
    const intent = { productId: String(this.data.id), productIds: [String(this.data.id)], autoPay: true, from: 'product' };
    wx.setStorageSync('checkoutIntent', intent);
    wx.navigateTo({ url: `/pages/address-list/address-list?checkout=1&productId=${this.data.id}&productIds=${this.data.id}&autoPay=1` });
  }
});
