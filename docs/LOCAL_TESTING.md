# 本地完整测试流程

## 1. 推荐：零基础设施测试模式

这个模式专门用于微信开发者工具本地测试，不需要 MySQL、Redis、微信支付商户号。

```bash
cd backend
npm install
npm run build
npm run start:local
```

后端地址：

```text
http://127.0.0.1:3000/api
```

开发测试默认支持：

- 微信登录 mock：不需要真实 AppID。
- 微信支付 mock：不需要商户号和证书。
- 内置测试商品和默认地址。
- 本地数据会保存到 `backend/local-test.sqlite`，明天继续启动 `npm run start:local` 即可接着测试。

## 2. 可选：MySQL 和 Redis 模式

```bash
cd backend
docker compose up -d mysql redis
```

如果没有 Docker，也可以手动启动 MySQL 8 和 Redis 7，然后执行：

```bash
mysql -uroot -p < src/database/schema.sql
mysql -uroot -p < src/database/seed.sql
```

## 3. 配置后端

```bash
cd backend
copy .env.example .env
```

## 4. 启动后端

```bash
cd backend
npm install
npm run start:dev
```

后端地址：

```text
http://127.0.0.1:3000/api
```

## 5. 导入小程序

微信开发者工具导入：

```text
C:\Users\zhang\Documents\小程序\miniprogram
```

AppID 没有正式号时可以使用测试号。导入后点击“编译”。

确认微信开发者工具已关闭“校验合法域名、web-view、TLS 版本以及 HTTPS 证书”，否则本地 `http://127.0.0.1:3000` 请求会被拦截。

## 6. 完整测试路径

1. 打开小程序首页，能看到 4 个测试商品。
2. 点击商品进入详情。
3. 点击“加入购物车”。
4. 进入购物车，点击“去结算”。
5. 选择或新增地址。
6. 创建订单后进入订单详情。
7. 点击“微信支付”，开发环境会自动模拟支付成功。
8. 回到订单列表，订单状态应变为 `PAID`。

## 7. 后台接口测试

```bash
curl http://127.0.0.1:3000/api/admin/products
curl http://127.0.0.1:3000/api/admin/orders
curl http://127.0.0.1:3000/api/admin/finance/stats
```
