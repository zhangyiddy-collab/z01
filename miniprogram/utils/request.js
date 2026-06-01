const { API_BASE_URL } = require('./config');

function request(options) {
  const token = wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401 && options.url !== '/auth/wechat-login') {
          getApp().login()
            .then(() => request(options).then(resolve).catch(reject))
            .catch(reject);
        } else {
          wx.showToast({ title: res.data && res.data.message ? res.data.message : '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail(error) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(error);
      }
    });
  });
}

module.exports = { request };
