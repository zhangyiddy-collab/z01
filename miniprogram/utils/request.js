const { API_BASE_URL, API_BASE_URLS } = require('./config');

function request(options) {
  const token = wx.getStorageSync('token');
  const baseUrls = API_BASE_URLS && API_BASE_URLS.length ? API_BASE_URLS : [API_BASE_URL];
  return new Promise((resolve, reject) => {
    const send = (index) => {
      const baseUrl = baseUrls[index];
      wx.request({
        url: `${baseUrl}${options.url}`,
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
            wx.showToast({ title: res.data && res.data.message ? res.data.message : `请求失败 ${res.statusCode}`, icon: 'none' });
            reject(res.data);
          }
        },
        fail(error) {
          if (index < baseUrls.length - 1) {
            send(index + 1);
            return;
          }
          wx.showToast({ title: '网络异常，请确认后端已启动', icon: 'none' });
          reject(error);
        }
      });
    };
    send(0);
  });
}

module.exports = { request };
