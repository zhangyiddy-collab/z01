Component({
  properties: {
    product: Object
  },
  methods: {
    open() {
      wx.navigateTo({ url: `/pages/product/product?id=${this.data.product.id}` });
    }
  }
});
