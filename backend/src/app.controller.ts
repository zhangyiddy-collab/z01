import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index() {
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KS同款代购后端</title>
  <style>
    body{margin:0;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:960px;margin:0 auto;padding:32px 20px}
    h1{margin:0 0 8px;font-size:28px}
    p{color:#64748b}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:24px}
    a{display:block;padding:18px 20px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#111827;text-decoration:none}
    a strong{display:block;margin-bottom:6px;color:#16a34a}
    code{padding:2px 6px;border-radius:6px;background:#e5e7eb}
  </style>
</head>
<body>
  <main>
    <h1>KS同款代购后端已运行</h1>
    <p>本地测试 API：<code>http://127.0.0.1:3000/api</code></p>
    <div class="grid">
      <a href="/api/products"><strong>商品列表</strong><span>/api/products</span></a>
      <a href="/api/admin"><strong>后台总览</strong><span>每日 / 每周 / 每月统计</span></a>
      <a href="/api/admin/products"><strong>后台商品</strong><span>上传、改价、上下架、删除</span></a>
      <a href="/api/admin/orders"><strong>后台订单</strong><span>订单与已付金额统计</span></a>
      <a href="/api/admin/finance/stats"><strong>财务统计</strong><span>今日、本周、本月、累计</span></a>
      <a href="/api/admin/exports/purchase"><strong>采购单打印</strong><span>可查看，可下载 Excel</span></a>
      <a href="/api/admin/exports/delivery"><strong>配送单打印</strong><span>外卖小票格式</span></a>
    </div>
  </main>
</body>
</html>`;
  }
}
