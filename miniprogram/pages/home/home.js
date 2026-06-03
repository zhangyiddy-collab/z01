const { request } = require('../../utils/request');
const { yuan } = require('../../utils/money');

Page({
  data: {
    keyword: '',
    category: '',
    categories: [
      { label: '全部', value: '' },
      { label: '食品', value: 'FOOD' },
      { label: '饮品', value: 'DRINK' },
      { label: '生鲜', value: 'FRESH' },
      { label: '日用', value: 'DAILY' }
    ],
    products: [],
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    loading: false,
    hasPrev: false,
    hasNext: false,
    hotImageUrl: '',
    hotProductId: '',
    hotProductName: '',
    hotProductDesc: '',
    hotProductPriceText: ''
  },
  onShow() {
    this.loadHotImage();
    this.load(1);
  },
  loadHotImage() {
    request({ url: '/products/hot-sale' })
      .then((res) => {
        const product = res.product || {};
        this.setData({
          hotImageUrl: res.imageUrl || product.coverUrl || '',
          hotProductId: res.productId ? String(res.productId) : '',
          hotProductName: product.name || '',
          hotProductDesc: product.subtitle || '',
          hotProductPriceText: product.price ? yuan(product.price) : ''
        });
      })
      .catch(() => this.setData({ hotImageUrl: '', hotProductId: '', hotProductName: '', hotProductDesc: '', hotProductPriceText: '' }));
  },
  openHotSale() {
    if (!this.data.hotProductId) return wx.showToast({ title: '请先设置热销商品', icon: 'none' });
    wx.navigateTo({ url: `/pages/product/product?id=${this.data.hotProductId}` });
  },
  onInput(e) {
    this.setData({ keyword: e.detail.value });
    if (!e.detail.value) this.load(1, true);
  },
  selectCategory(e) {
    this.setData({ category: e.currentTarget.dataset.value || '' });
    this.load(1, true);
  },
  search() {
    this.load(1, true);
  },
  load(page, scrollTop) {
    if (this.data.loading) return;
    const nextPage = Math.max(1, page || 1);
    const keyword = encodeURIComponent(this.data.keyword);
    const category = encodeURIComponent(this.data.category);
    this.setData({ loading: true });
    request({ url: `/products?keyword=${keyword}&category=${category}&page=${nextPage}&pageSize=${this.data.pageSize}` })
      .then((res) => {
        const items = (res.items || res || []).map((item) => ({ ...item, priceText: yuan(item.price) }));
        const totalPages = res.totalPages || 1;
        this.setData({
          products: items,
          page: nextPage,
          total: res.total || items.length,
          totalPages,
          hasPrev: nextPage > 1,
          hasNext: nextPage < totalPages
        }, () => {
          if (scrollTop) wx.pageScrollTo({ scrollTop: 0, duration: 200 });
        });
      })
      .finally(() => this.setData({ loading: false }));
  },
  prevPage() {
    if (!this.data.hasPrev || this.data.loading) return;
    this.load(this.data.page - 1, true);
  },
  nextPage() {
    if (!this.data.hasNext || this.data.loading) return;
    this.load(this.data.page + 1, true);
  }
});
