const { request } = require('../../utils/request');
const { yuan } = require('../../utils/money');

Page({
  data: { id: '', order: null },
  onLoad(query) {
    this.setData({ id: query.id });
    this.load();
  },
  load() {
    request({ url: `/orders/${this.data.id}` }).then((order) => this.setData({
      order: {
        ...order,
        amountText: yuan(order.payableAmount),
        statusText: statusText(order.status),
        items: (order.items || []).map((item) => ({ ...item, totalText: yuan(item.totalPrice) }))
      }
    }));
  },
  pay() {
    request({ url: `/payments/wechat/prepay/${this.data.id}`, method: 'POST' })
      .then((res) => {
        if (res.payParams && res.payParams.paySign === 'replace_with_wechatpay_signature') {
          return request({ url: `/payments/mock-success/${this.data.id}`, method: 'POST' }).then(() => {
            wx.showToast({ title: '模拟支付成功' });
            this.load();
          });
        }
        return wx.requestPayment({
          ...res.payParams,
          success: () => {
            wx.showToast({ title: '支付成功' });
            this.load();
          },
          fail: () => wx.showToast({ title: '支付取消', icon: 'none' })
        });
      })
      .catch(() => {
        request({ url: `/payments/mock-success/${this.data.id}`, method: 'POST' }).then(() => {
          wx.showToast({ title: '支付成功' });
          this.load();
        });
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
