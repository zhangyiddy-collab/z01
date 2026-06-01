const { request } = require('../../utils/request');
const { yuan } = require('../../utils/money');

Page({
  data: { orders: [] },
  onShow() {
    this.load();
  },
  load() {
    request({ url: '/orders' }).then((orders) => this.setData({
      orders: orders.map((item) => ({
        ...item,
        amountText: yuan(item.payableAmount),
        statusText: statusText(item.status)
      }))
    }));
  },
  open(e) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}` });
  }
});

function statusText(status) {
  return ({
    PENDING_PAYMENT: '待支付',
    PAID: '已支付',
    PURCHASING: '采购中',
    DELIVERING: '配送中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REFUNDED: '已退款'
  })[status] || status;
}
