const { request } = require('../../utils/request');

Page({
  data: { form: { name: '', phone: '', communityName: '', buildingNo: '', unitNo: '', roomNo: '', isDefault: true } },
  input(e) {
    this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value });
  },
  save() {
    const form = this.data.form;
    if (!form.name || !form.phone || !form.communityName || !form.buildingNo || !form.unitNo || !form.roomNo) {
      return wx.showToast({ title: '请填写完整地址', icon: 'none' });
    }
    request({ url: '/addresses', method: 'POST', data: this.data.form })
      .then(() => wx.navigateBack());
  }
});
