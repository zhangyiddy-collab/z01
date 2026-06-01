# 部署文档

## 1. 环境要求

- Node.js 20+
- MySQL 8
- Redis 7
- Nginx
- 腾讯云 COS
- 微信支付 V3 商户号、证书、API v3 Key

## 2. 初始化数据库

```bash
mysql -uroot -p < backend/src/database/schema.sql
```

## 3. 配置后端

```bash
cd backend
cp .env.example .env
npm install
npm run build
npm run start:prod
```

生产环境建议使用 PM2：

```bash
pm2 start dist/main.js --name ks-daigou-api
pm2 save
```

## 4. Nginx 反向代理

```nginx
server {
  listen 443 ssl;
  server_name api.example.com;

  ssl_certificate /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key /etc/nginx/ssl/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 5. 微信小程序发布

1. 使用微信开发者工具导入 `miniprogram`。
2. 设置合法 request 域名为后端 HTTPS 域名。
3. 修改 `utils/config.js` 的 `API_BASE_URL`。
4. 上传代码并提交审核。

## 6. 支付回调

微信支付 V3 回调地址：

```text
https://api.example.com/payments/wechat/notify
```

回调处理已按 `out_trade_no` 加 Redis 锁，并以数据库唯一索引兜底，保证幂等。

