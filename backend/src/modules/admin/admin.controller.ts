import { Body, Controller, Get, Headers, Header, Param, Patch, Post, Query, Redirect, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { OrderStatus, ProductCategory, ProductStatus } from '../../database/entities';
import { AdminService } from './admin.service';

class ProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsString()
  coverUrl!: string;

  @IsInt()
  @Min(1)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;
}

class OrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async dashboard() {
    const [products, orders, stats] = await Promise.all([
      this.adminService.products(),
      this.adminService.orders(),
      this.adminService.financeStats(),
    ]);
    return this.renderDashboard(products.total, orders, stats);
  }

  @Get('products')
  async products(@Headers('accept') accept?: string, @Query('format') format?: string, @Query('page') page?: string) {
    const products = await this.adminService.products(Number(page || 1), 10);
    if (!wantsJson(accept, format)) return this.renderProducts(products.items, products);
    return products;
  }

  @Post('products')
  createProduct(@Body() dto: ProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Post('products/create')
  @Redirect('/api/admin/products', 302)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'products');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  createProductFromForm(@Body() body: Record<string, string>, @UploadedFile() file?: Express.Multer.File) {
    const coverUrl = file ? `/uploads/products/${file.filename}` : body.coverUrl || '';
    return this.adminService.createProduct({
      name: body.name,
      subtitle: body.subtitle,
      category: (body.category as ProductCategory) || ProductCategory.FOOD,
      coverUrl,
      images: coverUrl ? [coverUrl] : [],
      price: Math.round(Number(body.priceYuan || 0) * 100),
      marketPrice: Math.round(Number(body.marketPriceYuan || body.priceYuan || 0) * 100),
      stock: 999,
      status: ProductStatus.ON_SALE,
      sort: Number(body.sort || 0),
    });
  }

  @Patch('products/:id/status')
  updateProductStatus(@Param('id') id: string, @Body('status') status: ProductStatus) {
    return this.adminService.updateProductStatus(id, status);
  }

  @Post('products/:id/status')
  @Redirect('/api/admin/products', 302)
  updateProductStatusFromForm(@Param('id') id: string, @Body('status') status: ProductStatus) {
    return this.adminService.updateProductStatus(id, status);
  }

  @Post('products/:id/price')
  @Redirect('/api/admin/products', 302)
  updateProductPrice(@Param('id') id: string, @Body('priceYuan') priceYuan: string) {
    return this.adminService.updateProductPrice(id, priceYuan);
  }

  @Post('products/:id/image')
  @Redirect('/api/admin/products', 302)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'products');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateProductImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) return undefined;
    return this.adminService.updateProductCover(id, `/uploads/products/${file.filename}`);
  }

  @Post('products/:id/delete')
  @Redirect('/api/admin/products', 302)
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  @Get('orders')
  async orders(@Query('status') status?: OrderStatus, @Headers('accept') accept?: string, @Query('format') format?: string) {
    const orders = await this.adminService.orders(status);
    if (!wantsJson(accept, format)) return this.renderOrders(orders);
    return orders;
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: OrderStatusDto) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }

  @Post('orders/:id/delete')
  @Redirect('/api/admin/orders', 302)
  deleteOrder(@Param('id') id: string) {
    return this.adminService.deleteOrder(id);
  }

  @Get('finance/stats')
  async stats(@Headers('accept') accept?: string, @Query('format') format?: string) {
    const stats = await this.adminService.financeStats();
    if (!wantsJson(accept, format)) return this.renderStats(stats);
    return stats;
  }

  private renderDashboard(productCount: number, orders: unknown[], stats: { orderCount: number; paidAmount: number }) {
    return this.layout('后台总览', `
      <section class="stats">
        <div><strong>${productCount}</strong><span>商品数</span></div>
        <div><strong>${orders.length}</strong><span>订单数</span></div>
        <div><strong>¥${money(stats.paidAmount)}</strong><span>已付金额</span></div>
      </section>
      <section class="grid">
        <a href="/api/admin/products">商品管理</a>
        <a href="/api/admin/orders">订单管理</a>
        <a href="/api/admin/finance/stats">财务统计</a>
        <a href="/api/admin/exports/purchase.xlsx">采购单 Excel</a>
        <a href="/api/admin/exports/delivery.pdf">配送单 PDF</a>
      </section>
    `);
  }

  private renderProducts(
    products: Array<{ id: string; name: string; subtitle?: string; category?: string; coverUrl?: string; price: number; status: string }>,
    pagination: { total: number; page: number; pageSize: number; totalPages: number },
  ) {
    const rows = products
      .map((item) => {
        const nextStatus = item.status === ProductStatus.ON_SALE ? ProductStatus.OFF_SALE : ProductStatus.ON_SALE;
        const actionText = item.status === ProductStatus.ON_SALE ? '下架' : '上架';
        const actionClass = item.status === ProductStatus.ON_SALE ? 'warning' : '';
        return `<tr>
        <td>${item.id}</td>
        <td><img class="thumb" src="${item.coverUrl || ''}" /><div>${escapeHtml(item.name)}</div></td>
        <td>${categoryText(item.category)}</td>
        <td>
          <form class="inline" method="post" action="/api/admin/products/${item.id}/price">
            <input name="priceYuan" value="${money(item.price)}" />
            <button type="submit">改价</button>
          </form>
        </td>
        <td>
          <form class="upload" method="post" action="/api/admin/products/${item.id}/image" enctype="multipart/form-data">
            <input type="file" name="image" accept="image/*" />
            <button type="submit">上传</button>
          </form>
        </td>
        <td>${item.status}</td>
        <td>
          <form class="inline" method="post" action="/api/admin/products/${item.id}/status" onsubmit="return confirm('确定${actionText}商品 ${escapeHtml(item.name)} 吗？')">
            <input type="hidden" name="status" value="${nextStatus}" />
            <button class="${actionClass}" type="submit">${actionText}</button>
          </form>
          <form class="inline" method="post" action="/api/admin/products/${item.id}/delete" onsubmit="return confirm('确定删除商品 ${escapeHtml(item.name)} 吗？删除后不可恢复。')">
            <button class="danger" type="submit">删除</button>
          </form>
        </td>
      </tr>`;
      })
      .join('');
    const prevPage = Math.max(1, pagination.page - 1);
    const nextPage = Math.min(pagination.totalPages, pagination.page + 1);
    const pager = `<div class="pager">
      <a class="${pagination.page <= 1 ? 'disabled' : ''}" href="/api/admin/products?page=${prevPage}">上一页</a>
      <span>第 ${pagination.page} / ${pagination.totalPages} 页，共 ${pagination.total} 条，每页 ${pagination.pageSize} 条</span>
      <a class="${pagination.page >= pagination.totalPages ? 'disabled' : ''}" href="/api/admin/products?page=${nextPage}">下一页</a>
    </div>`;
    return this.layout(
      '商品管理',
      `<section class="panel">
        <h2>新增商品</h2>
        <form class="create" method="post" action="/api/admin/products/create" enctype="multipart/form-data">
          <input name="name" placeholder="商品名称" required />
          <input name="subtitle" placeholder="副标题" />
          <select name="category">
            <option value="FOOD">食品</option>
            <option value="DRINK">饮品</option>
            <option value="FRESH">生鲜</option>
            <option value="DAILY">日用</option>
          </select>
          <input name="priceYuan" placeholder="价格，如 12.90" required />
          <input type="file" name="image" accept="image/*" required />
          <button type="submit">新增商品</button>
        </form>
      </section>
      <table><thead><tr><th>ID</th><th>商品</th><th>分类</th><th>价格</th><th>图片</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>${pager}`,
    );
  }

  private renderOrders(orders: Array<{ id: string; orderNo: string; status: string; payableAmount: number; paidAmount: number }>) {
    const rows = orders
      .map((item) => `<tr>
        <td>${item.id}</td>
        <td>${item.orderNo}</td>
        <td>${statusText(item.status)}</td>
        <td>¥${money(item.payableAmount)}</td>
        <td>¥${money(item.paidAmount)}</td>
        <td>
          <form class="inline" method="post" action="/api/admin/orders/${item.id}/delete" onsubmit="return confirm('确定删除订单 ${item.orderNo} 吗？删除后不可恢复。')">
            <button class="danger" type="submit">删除</button>
          </form>
        </td>
      </tr>`)
      .join('');
    return this.layout('订单管理', `<table><thead><tr><th>ID</th><th>订单号</th><th>状态</th><th>应付</th><th>已付</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  private renderStats(stats: { orderCount: number; paidAmount: number }) {
    return this.layout('财务统计', `<section class="stats"><div><strong>${stats.orderCount}</strong><span>已付订单</span></div><div><strong>¥${money(stats.paidAmount)}</strong><span>已付金额</span></div></section>`);
  }

  private layout(title: string, content: string) {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title><style>
      body{margin:0;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      main{max-width:1120px;margin:0 auto;padding:28px 18px 48px}
      nav{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0 22px}
      nav a,.grid a{padding:12px 16px;border:1px solid #dcfce7;border-radius:8px;background:#fff;color:#16a34a;text-decoration:none;font-weight:700}
      h1{margin:0;font-size:28px}.muted{color:#64748b}
      .pager{display:flex;gap:12px;align-items:center;justify-content:center;margin:18px 0;flex-wrap:wrap}
      .pager a{padding:9px 14px;border-radius:6px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700}
      .pager a.disabled{pointer-events:none;background:#cbd5e1;color:#64748b}
      .pager span{color:#475569}
      .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:18px 0}
      .stats div{padding:18px;background:#fff;border:1px solid #e5e7eb;border-radius:8px}.stats strong{display:block;font-size:26px;color:#16a34a}.stats span{color:#64748b}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
      table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden}th,td{padding:13px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}th{background:#f1f5f9}
      .thumb{width:58px;height:58px;object-fit:cover;border-radius:8px;background:#e5e7eb;margin-right:10px;vertical-align:middle}
      form.inline,form.upload{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0}
      .panel{padding:18px;margin:18px 0;background:#fff;border:1px solid #e5e7eb;border-radius:8px}
      .panel h2{margin:0 0 14px;font-size:20px}
      form.create{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:center}
      input,select{padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff}
      input[type=text],input[name=priceYuan]{width:82px}
      input[type=file]{max-width:180px}
      button{padding:8px 12px;border:0;border-radius:6px;background:#22c55e;color:#fff;font-weight:700;cursor:pointer}
      button.warning{background:#f59e0b}
      button.danger{background:#ef4444}
    </style></head><body><main><h1>${title}</h1><p class="muted">KS同款代购后台测试页</p><nav><a href="/api/admin">总览</a><a href="/api/admin/products">商品</a><a href="/api/admin/orders">订单</a><a href="/api/admin/finance/stats">财务</a></nav>${content}</main></body></html>`;
  }
}

function money(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

function categoryText(category?: string) {
  return ({ FOOD: '食品', DRINK: '饮品', FRESH: '生鲜', DAILY: '日用' } as Record<string, string>)[category || ''] || category || '-';
}

function statusText(status: string) {
  return ({ PENDING_PAYMENT: '待支付', PAID: '已支付', PURCHASING: '采购中', DELIVERING: '配送中', COMPLETED: '已完成', CANCELLED: '已取消', REFUNDED: '已退款' } as Record<string, string>)[status] || status;
}

function wantsJson(accept?: string, format?: string) {
  return format === 'json' || Boolean(accept?.includes('application/json'));
}
