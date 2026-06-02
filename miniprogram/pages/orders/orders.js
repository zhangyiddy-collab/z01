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
  },
  remove(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除订单',
      content: '确定删除这个订单记录吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (!res.confirm) return;
        request({ url: `/orders/${id}`, method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除' });
          this.setData({ orders: this.data.orders.filter((item) => String(item.id) !== String(id)) });
        });
      }
    });
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
