import { Body, Controller, Get, Header, Headers, Param, Patch, Post, Query, Redirect, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Response } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AdminRole, OrderStatus, ProductCategory, ProductStatus } from '../../database/entities';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminPublic, AdminRoles } from './admin-auth.decorators';
import { AdminService, FinanceStats, PeriodMetric } from './admin.service';

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

class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  next?: string;
}

class AccountDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

@UseGuards(AdminAuthGuard)
@AdminRoles(AdminRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('login')
  @AdminPublic()
  @Header('Content-Type', 'text/html; charset=utf-8')
  loginPage(@Query('next') next?: string) {
    return this.adminService.renderLogin('', safeNext(next));
  }

  @Post('login')
  @AdminPublic()
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    try {
      const result = await this.adminService.login(dto.username, dto.password);
      res.setHeader('Set-Cookie', this.adminService.loginCookie(result.token));
      return res.redirect(safeNext(dto.next));
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      return res.status(401).type('html').send(this.adminService.renderLogin(message, safeNext(dto.next)));
    }
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.setHeader('Set-Cookie', this.adminService.logoutCookie());
    return res.redirect('/api/admin/login');
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async dashboard() {
    const [products, orders, stats] = await Promise.all([
      this.adminService.products(),
      this.adminService.orders(),
      this.adminService.financeStats(),
    ]);
    return this.renderDashboard(products.total, orders.length, stats);
  }

  @Get('products')
  async products(@Headers('accept') accept?: string, @Query('format') format?: string, @Query('page') page?: string) {
    const products = await this.adminService.products(Number(page || 1), 10);
    const hotSale = await this.adminService.hotSaleSettings();
    const hotSaleProduct = await this.adminService.hotSaleProduct(hotSale.productId);
    if (!wantsJson(accept, format)) return this.renderProducts(products.items, products, hotSale, hotSaleProduct);
    return { ...products, hotSale, hotSaleProduct };
  }

  @Post('products')
  createProduct(@Body() dto: ProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Post('products/create')
  @Redirect('/api/admin/products', 302)
  @UseInterceptors(productImageInterceptor())
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
  @UseInterceptors(productImageInterceptor())
  updateProductImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) return undefined;
    return this.adminService.updateProductCover(id, `/uploads/products/${file.filename}`);
  }

  @Post('hot-sale')
  @Redirect('/api/admin/products', 302)
  updateHotSale(@Body() body: Record<string, string>) {
    return this.adminService.updateHotSaleSettings(body.productNo || body.productId);
  }

  @Post('products/:id/delete')
  @Redirect('/api/admin/products', 302)
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  @Get('orders')
  async orders(@Query('status') status?: OrderStatus, @Headers('accept') accept?: string, @Query('format') format?: string) {
    const [orders, stats] = await Promise.all([this.adminService.orders(status), this.adminService.financeStats()]);
    if (!wantsJson(accept, format)) return this.renderOrders(orders, stats);
    return { items: orders, stats };
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

  @Get('accounts')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async accounts() {
    const accounts = await this.adminService.adminUsers();
    return this.renderAccounts(accounts);
  }

  @Post('accounts')
  @Redirect('/api/admin/accounts', 302)
  createAccount(@Body() dto: AccountDto) {
    return this.adminService.createAdminUser(dto.username, dto.password);
  }

  private renderDashboard(productCount: number, orderCount: number, stats: FinanceStats) {
    return this.layout(
      '后台总览',
      `${this.renderPeriodCards(stats)}
      <section class="stats">
        <div><strong>${productCount}</strong><span>商品总数</span></div>
        <div><strong>${orderCount}</strong><span>订单总数</span></div>
        <div><strong>¥${money(stats.paidAmount)}</strong><span>累计已付金额</span></div>
      </section>
      <section class="grid">
        <a href="/api/admin/products">商品管理</a>
        <a href="/api/admin/orders">订单管理</a>
        <a href="/api/admin/finance/stats">财务统计</a>
        <a href="/api/admin/exports/purchase">采购单打印</a>
        <a href="/api/admin/exports/delivery">配送单打印</a>
      </section>`,
    );
  }

  private renderProducts(
    products: Array<{ id: string; displayId?: number; name: string; subtitle?: string; category?: string; coverUrl?: string; price: number; status: string }>,
    pagination: { total: number; page: number; pageSize: number; totalPages: number },
    hotSale: { productId: string; productNo?: string },
    hotSaleProduct: { id: string; name: string; subtitle?: string; category?: string; coverUrl?: string; price: number; status: string } | null,
  ) {
    const rows = products
      .map((item) => {
        const nextStatus = item.status === ProductStatus.ON_SALE ? ProductStatus.OFF_SALE : ProductStatus.ON_SALE;
        const actionText = item.status === ProductStatus.ON_SALE ? '下架' : '上架';
        const actionClass = item.status === ProductStatus.ON_SALE ? 'warning' : '';
        return `<tr>
        <td>${item.displayId || ''}</td>
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
        <td>${statusText(item.status)}</td>
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
    const pageLinks = Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
      .map((page) => `<a class="${page === pagination.page ? 'active' : ''}" href="/api/admin/products?page=${page}">${page}</a>`)
      .join('');
    const pager = `<div class="pager">
      <a class="${pagination.page <= 1 ? 'disabled' : ''}" href="/api/admin/products?page=${prevPage}">上一页</a>
      ${pageLinks}
      <span>第 ${pagination.page} / ${pagination.totalPages} 页，共 ${pagination.total} 条，每页 ${pagination.pageSize} 条</span>
      <a class="${pagination.page >= pagination.totalPages ? 'disabled' : ''}" href="/api/admin/products?page=${nextPage}">下一页</a>
    </div>`;
    return this.layout(
      '商品管理',
      `<section class="panel">
        <h2>热销设置</h2>
        <form class="hot-form" method="post" action="/api/admin/hot-sale">
          <input name="productNo" placeholder="热销商品序号" value="${escapeHtml(hotSale.productNo || '')}" required />
          <button type="submit">保存热销设置</button>
        </form>
        ${
          hotSaleProduct
            ? `<div class="hot-product">
                <img class="hot-thumb" src="${hotSaleProduct.coverUrl || ''}" />
                <div>
                  <strong>${escapeHtml(hotSaleProduct.name)}</strong>
                  <span>序号 ${hotSale.productNo || '-'} / ${categoryText(hotSaleProduct.category)} / ¥${money(hotSaleProduct.price)}</span>
                  <small>只需填写商品序号。前台热销款会自动读取这件商品的图片、名称和价格，点击后直接进入购买页。</small>
                </div>
              </div>`
            : '<p class="hint">这里只填写商品序号，不上传图片。在下方商品列表查看序号，填入这里后保存。</p>'
        }
      </section>
      <section class="panel">
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
      <table><thead><tr><th>序号</th><th>商品</th><th>分类</th><th>价格</th><th>图片</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>${pager}`,
    );
  }

  private renderOrders(
    orders: Array<{ id: string; orderNo: string; status: string; payableAmount: number; paidAmount: number; remark?: string; createdAt?: Date; paidAt?: Date }>,
    stats: FinanceStats,
  ) {
    const rows = orders
      .map((item) => `<tr>
        <td>${item.id}</td>
        <td>${item.orderNo}</td>
        <td>${statusText(item.status)}</td>
        <td>¥${money(item.payableAmount)}</td>
        <td>¥${money(item.paidAmount)}</td>
        <td>${item.remark ? escapeHtml(item.remark) : '-'}</td>
        <td>${formatDate(item.paidAt || item.createdAt)}</td>
        <td>
          <form class="inline" method="post" action="/api/admin/orders/${item.id}/delete" onsubmit="return confirm('确定删除订单 ${item.orderNo} 吗？删除后不可恢复。')">
            <button class="danger" type="submit">删除</button>
          </form>
        </td>
      </tr>`)
      .join('');
    return this.layout(
      '订单管理',
      `${this.renderPeriodCards(stats)}
      <table><thead><tr><th>ID</th><th>订单号</th><th>状态</th><th>应付</th><th>已付</th><th>备注</th><th>时间</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  }

  private renderStats(stats: FinanceStats) {
    const rows = [
      ['今日', stats.periods.today],
      ['本周', stats.periods.week],
      ['本月', stats.periods.month],
      ['累计', stats.periods.total],
    ]
      .map(
        ([label, item]) => `<tr>
        <td>${label}</td>
        <td>${(item as PeriodMetric).orderCount}</td>
        <td>${(item as PeriodMetric).paidOrderCount}</td>
        <td>${(item as PeriodMetric).purchaseItemCount}</td>
        <td>¥${money((item as PeriodMetric).paidAmount)}</td>
      </tr>`,
      )
      .join('');
    return this.layout(
      '财务统计',
      `${this.renderPeriodCards(stats)}
      <table><thead><tr><th>周期</th><th>订单数</th><th>已支付订单</th><th>采购件数</th><th>已付金额</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  }

  private renderAccounts(accounts: Array<{ id: string; username: string; role: AdminRole; status: number; lastLoginAt?: Date }>) {
    const rows = accounts
      .map(
        (item) => `<tr>
        <td>${item.id}</td>
        <td>${escapeHtml(item.username)}</td>
        <td>管理员</td>
        <td>${item.status === 1 ? '启用' : '停用'}</td>
        <td>${formatDate(item.lastLoginAt)}</td>
      </tr>`,
      )
      .join('');
    return this.layout(
      '账号管理',
      `<section class="panel">
        <h2>新增后台账号</h2>
        <form class="create" method="post" action="/api/admin/accounts">
          <input name="username" placeholder="账号" required />
          <input name="password" type="password" placeholder="密码，至少 6 位" required />
          <button type="submit">新增账号</button>
        </form>
      </section>
      <table><thead><tr><th>ID</th><th>账号</th><th>级别</th><th>状态</th><th>最后登录</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  }

  private renderPeriodCards(stats: FinanceStats) {
    const items: Array<[string, PeriodMetric]> = [
      ['今日', stats.periods.today],
      ['本周', stats.periods.week],
      ['本月', stats.periods.month],
      ['累计', stats.periods.total],
    ];
    return `<section class="stats period">
      ${items
        .map(
          ([label, item]) => `<div>
          <span>${label}</span>
          <strong>¥${money(item.paidAmount)}</strong>
          <small>订单 ${item.orderCount} / 已支付 ${item.paidOrderCount} / 采购 ${item.purchaseItemCount} 件</small>
        </div>`,
        )
        .join('')}
    </section>`;
  }

  private layout(title: string, content: string) {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title><style>
      body{margin:0;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      main{max-width:1120px;margin:0 auto;padding:28px 18px 48px}
      nav{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0 22px;align-items:center}
      nav a,.grid a{padding:12px 16px;border:1px solid #dcfce7;border-radius:8px;background:#fff;color:#16a34a;text-decoration:none;font-weight:700}
      nav form{margin-left:auto}nav button{background:#64748b}
      h1{margin:0;font-size:28px}.muted{color:#64748b}
      .pager{display:flex;gap:12px;align-items:center;justify-content:center;margin:18px 0;flex-wrap:wrap}
      .pager a{padding:9px 14px;border-radius:6px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700}
      .pager a.active{background:#111827}
      .pager a.disabled{pointer-events:none;background:#cbd5e1;color:#64748b}
      .pager span{color:#475569}
      .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:18px 0}
      .stats div{padding:18px;background:#fff;border:1px solid #e5e7eb;border-radius:8px}
      .stats strong{display:block;margin:8px 0;font-size:26px;color:#16a34a}
      .stats span{color:#64748b}.stats small{display:block;color:#64748b;line-height:1.5}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
      table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden}
      th,td{padding:13px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}th{background:#f1f5f9}
      .thumb{width:58px;height:58px;object-fit:cover;border-radius:8px;background:#e5e7eb;margin-right:10px;vertical-align:middle}
      form.inline,form.upload{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0}
      .panel{padding:18px;margin:18px 0;background:#fff;border:1px solid #e5e7eb;border-radius:8px}
      .panel h2{margin:0 0 14px;font-size:20px}
      .hint{margin:10px 0 0;color:#64748b;font-size:13px}
      .hot-product{display:flex;gap:12px;align-items:center;margin-top:14px;padding:12px;border-radius:8px;background:#f8fafc}
      .hot-thumb{width:72px;height:72px;object-fit:cover;border-radius:8px;background:#e5e7eb}
      .hot-product strong,.hot-product span,.hot-product small{display:block}.hot-product span,.hot-product small{margin-top:5px;color:#64748b}
      .hot-form{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.hot-form input{width:160px}.hot-form button{height:36px}
      form.create{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:center}
      input,select{padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff}
      input[type=text],input[name=priceYuan]{width:82px}
      input[type=file]{max-width:180px}
      button{padding:8px 12px;border:0;border-radius:6px;background:#22c55e;color:#fff;font-weight:700;cursor:pointer}
      button.warning{background:#f59e0b}button.danger{background:#ef4444}
    </style></head><body><main><h1>${title}</h1><p class="muted">KS同款代购后台测试页</p><nav><a href="/api/admin">总览</a><a href="/api/admin/products">商品</a><a href="/api/admin/orders">订单</a><a href="/api/admin/finance/stats">财务</a><a href="/api/admin/exports/purchase">采购单</a><a href="/api/admin/exports/delivery">配送单</a><a href="/api/admin/accounts">账号</a><form method="post" action="/api/admin/logout"><button type="submit">退出</button></form></nav>${content}</main></body></html>`;
  }
}

function productImageInterceptor() {
  return FileInterceptor('image', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'products');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
    }),
    fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}

function money(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

function formatDate(value?: Date) {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

function categoryText(category?: string) {
  return ({ FOOD: '食品', DRINK: '饮品', FRESH: '生鲜', DAILY: '日用' } as Record<string, string>)[category || ''] || category || '-';
}

function statusText(status: string) {
  return (
    {
      PENDING_PAYMENT: '待支付',
      PAID: '已支付',
      PURCHASING: '采购中',
      DELIVERING: '配送中',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
      REFUNDED: '已退款',
      ON_SALE: '上架',
      OFF_SALE: '下架',
    } as Record<string, string>
  )[status] || status;
}

function safeNext(next?: string) {
  if (!next || !next.startsWith('/api/admin')) return '/api/admin';
  if (next.includes('//')) return '/api/admin';
  return next;
}

function wantsJson(accept?: string, format?: string) {
  return format === 'json' || Boolean(accept?.includes('application/json'));
}
