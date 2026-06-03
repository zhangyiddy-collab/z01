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
            resolve(normalizeResponseUrls(res.data, baseUrl));
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

function normalizeResponseUrls(value, baseUrl) {
  const apiRoot = baseUrl.replace(/\/api\/?$/, '');
  if (Array.isArray(value)) return value.map((item) => normalizeResponseUrls(item, baseUrl));
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = normalizeResponseUrls(value[key], baseUrl);
      return result;
    }, {});
  }
  if (typeof value !== 'string') return value;
  if (value.indexOf('/uploads/') === 0) return `${apiRoot}${value}`;
  return value
    .replace(/^http:\/\/127\.0\.0\.1:3000/, apiRoot)
    .replace(/^http:\/\/localhost:3000/, apiRoot);
}

module.exports = { request };
