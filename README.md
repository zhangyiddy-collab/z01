# KS同款代购

生产级微信小程序代购系统骨架，包含：

- 微信小程序原生前端
- NestJS 后端 API
- MySQL 8 数据库设计
- Redis 防重复提交与缓存
- 腾讯云 COS 上传服务预留
- 微信支付 V3 预下单与回调幂等处理
- Excel / PDF 导出
- 单元测试与端到端测试入口

## 快速开始

```bash
cd backend
cp .env.example .env
npm install
npm run build
npm test
npm run start:dev
```

微信开发者工具导入 `miniprogram` 目录，修改 `miniprogram/utils/config.js` 中的 `API_BASE_URL`。

详细部署见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

本地完整测试见 [docs/LOCAL_TESTING.md](docs/LOCAL_TESTING.md)。
