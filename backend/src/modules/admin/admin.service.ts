import { BadRequestException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import {
  AdminRole,
  AdminUserEntity,
  CartEntity,
  OrderEntity,
  OrderItemEntity,
  OrderLogEntity,
  OrderStatus,
  PaymentEntity,
  PaymentLogEntity,
  ProductEntity,
  ProductStatus,
} from '../../database/entities';

export interface PeriodMetric {
  orderCount: number;
  paidOrderCount: number;
  paidAmount: number;
  purchaseItemCount: number;
}

export interface FinanceStats extends PeriodMetric {
  periods: {
    today: PeriodMetric;
    week: PeriodMetric;
    month: PeriodMetric;
    total: PeriodMetric;
  };
}

export interface AdminSession {
  id: string;
  username: string;
  role: AdminRole;
}

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.PURCHASING, OrderStatus.DELIVERING, OrderStatus.COMPLETED];
const ADMIN_COOKIE = 'ks_admin_token';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUserEntity) private readonly adminRepo: Repository<AdminUserEntity>,
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly orderItemRepo: Repository<OrderItemEntity>,
  ) {}

  async onModuleInit() {
    if (await this.adminRepo.count()) return;
    await this.adminRepo.save([
      {
        username: process.env.ADMIN_USERNAME || 'admin',
        passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin123456'),
        role: AdminRole.ADMIN,
        status: 1,
      },
      {
        username: process.env.DELIVERY_USERNAME || 'delivery',
        passwordHash: hashPassword(process.env.DELIVERY_PASSWORD || 'delivery123456'),
        role: AdminRole.DELIVERY,
        status: 1,
      },
    ]);
  }

  async login(username: string, password: string) {
    const admin = await this.adminRepo.findOneBy({ username });
    if (!admin || admin.status !== 1 || !verifyPassword(password, admin.passwordHash)) {
      throw new UnauthorizedException('账号或密码错误');
    }
    admin.lastLoginAt = new Date();
    await this.adminRepo.save(admin);
    const token = this.jwtService.sign(
      { type: 'admin', adminId: admin.id, username: admin.username, role: admin.role },
      { expiresIn: '12h' },
    );
    return { token, admin: this.toSession(admin) };
  }

  async currentAdmin(cookieHeader = ''): Promise<AdminSession | null> {
    const token = parseCookie(cookieHeader)[ADMIN_COOKIE];
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ type?: string; adminId?: string }>(token);
      if (payload.type !== 'admin' || !payload.adminId) return null;
      const admin = await this.adminRepo.findOneBy({ id: payload.adminId });
      if (!admin || admin.status !== 1) return null;
      return this.toSession(admin);
    } catch {
      return null;
    }
  }

  cookieName() {
    return ADMIN_COOKIE;
  }

  loginCookie(token: string) {
    return `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=${12 * 60 * 60}`;
  }

  logoutCookie() {
    return `${ADMIN_COOKIE}=; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=0`;
  }

  async adminUsers() {
    return this.adminRepo.find({ order: { id: 'ASC' } });
  }

  async createAdminUser(username: string, password: string, role: AdminRole) {
    const cleanUsername = String(username || '').trim();
    if (!cleanUsername) throw new BadRequestException('请输入账号');
    if (!password || password.length < 6) throw new BadRequestException('密码至少 6 位');
    const selectedRole = role === AdminRole.DELIVERY ? AdminRole.DELIVERY : AdminRole.ADMIN;
    return this.adminRepo.save({
      username: cleanUsername,
      passwordHash: hashPassword(password),
      role: selectedRole,
      status: 1,
    });
  }

  roleName(role: AdminRole) {
    return role === AdminRole.ADMIN ? '管理员' : '配送员';
  }

  renderLogin(message = '', next = '/api/admin') {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>后台登录</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.box{width:min(420px,calc(100vw - 36px));padding:28px;background:#fff;border:1px solid #e5e7eb;border-radius:8px}
h1{margin:0 0 18px}.field{margin-bottom:14px}label{display:block;margin-bottom:6px;color:#475569}input,select{box-sizing:border-box;width:100%;height:42px;padding:0 12px;border:1px solid #cbd5e1;border-radius:6px}
button{width:100%;height:44px;border:0;border-radius:6px;background:#22c55e;color:#fff;font-weight:800;cursor:pointer}.msg{margin-bottom:14px;color:#dc2626}
.tips{margin-top:16px;color:#64748b;font-size:13px;line-height:1.7}
</style></head><body><form class="box" method="post" action="/api/admin/login">
<h1>后台登录</h1>${message ? `<div class="msg">${escapeHtml(message)}</div>` : ''}
<input type="hidden" name="next" value="${escapeHtml(next)}" />
<div class="field"><label>账号</label><input name="username" autocomplete="username" required /></div>
<div class="field"><label>密码</label><input name="password" type="password" autocomplete="current-password" required /></div>
<button type="submit">登录</button>
<div class="tips">测试账号：admin / admin123456<br />配送员：delivery / delivery123456</div>
</form></body></html>`;
  }

  renderForbidden(admin: AdminSession) {
    const home = admin.role === AdminRole.DELIVERY ? '/api/admin/exports/delivery' : '/api/admin';
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>无权限</title><style>body{margin:0;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:520px;margin:80px auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:8px}a,button{display:inline-block;margin-right:10px;padding:10px 14px;border:0;border-radius:6px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><main><h1>无权限</h1><p>${escapeHtml(admin.username)} 是${this.roleName(admin.role)}，不能查看这个页面。</p><a href="${home}">返回可用页面</a><form method="post" action="/api/admin/logout" style="display:inline"><button type="submit">退出登录</button></form></main></body></html>`;
  }

  async products(page = 1, pageSize = 10) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
    const [items, total] = await this.productRepo.findAndCount({
      order: { id: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  createProduct(dto: Partial<ProductEntity>) {
    return this.productRepo.save(dto);
  }

  async updateProductStatus(id: string, status: ProductStatus) {
    await this.productRepo.update(id, { status });
    return this.productRepo.findOneBy({ id });
  }

  async updateProductPrice(id: string, priceYuan: string) {
    const price = Math.round(Number(priceYuan) * 100);
    if (!Number.isFinite(price) || price <= 0) throw new Error('价格不正确');
    await this.productRepo.update(id, { price });
    return this.productRepo.findOneBy({ id });
  }

  async updateProductCover(id: string, coverUrl: string) {
    await this.productRepo.update(id, { coverUrl, images: [coverUrl] });
    return this.productRepo.findOneBy({ id });
  }

  async deleteProduct(id: string) {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(CartEntity, { productId: id });
      await manager.delete(ProductEntity, { id });
      return { ok: true };
    });
  }

  orders(status?: OrderStatus) {
    return this.orderRepo.find({ where: status ? { status } : {}, order: { id: 'DESC' } });
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    await this.orderRepo.update(id, { status });
    return this.orderRepo.findOneBy({ id });
  }

  async deleteOrder(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOneBy(OrderEntity, { id });
      if (!order) return { ok: true };

      await manager.delete(PaymentLogEntity, { orderNo: order.orderNo });
      await manager.delete(PaymentEntity, { orderId: id });
      await manager.delete(OrderLogEntity, { orderId: id });
      await manager.delete(OrderItemEntity, { orderId: id });
      await manager.delete(OrderEntity, { id });
      return { ok: true };
    });
  }

  async financeStats(): Promise<FinanceStats> {
    const [orders, items] = await Promise.all([this.orderRepo.find(), this.orderItemRepo.find()]);
    const itemCountByOrderId = new Map<string, number>();
    items.forEach((item) => {
      const orderId = String(item.orderId);
      itemCountByOrderId.set(orderId, (itemCountByOrderId.get(orderId) || 0) + Number(item.quantity || 0));
    });

    const ranges = periodRanges();
    const periods = {
      today: this.metricForOrders(orders, itemCountByOrderId, ranges.today),
      week: this.metricForOrders(orders, itemCountByOrderId, ranges.week),
      month: this.metricForOrders(orders, itemCountByOrderId, ranges.month),
      total: this.metricForOrders(orders, itemCountByOrderId),
    };

    return {
      ...periods.total,
      periods,
    };
  }

  private toSession(admin: AdminUserEntity): AdminSession {
    return { id: admin.id, username: admin.username, role: admin.role };
  }

  private metricForOrders(orders: OrderEntity[], itemCountByOrderId: Map<string, number>, start?: Date): PeriodMetric {
    const periodOrders = orders.filter((order) => !start || isAfter(order.createdAt, start));
    const paidOrders = orders.filter((order) => {
      if (!PAID_STATUSES.includes(order.status)) return false;
      return !start || isAfter(order.paidAt || order.createdAt, start);
    });

    return {
      orderCount: periodOrders.length,
      paidOrderCount: paidOrders.length,
      paidAmount: paidOrders.reduce((sum, order) => sum + Number(order.paidAmount || order.payableAmount || 0), 0),
      purchaseItemCount: paidOrders.reduce((sum, order) => sum + (itemCountByOrderId.get(String(order.id)) || 0), 0),
    };
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const iterations = 120000;
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsText, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterationsText || !salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, Number(iterationsText), 32, 'sha256');
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

function parseCookie(header: string) {
  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const index = part.indexOf('=');
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    return cookies;
  }, {});
}

function periodRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(today);
  const day = today.getDay() || 7;
  week.setDate(today.getDate() - day + 1);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  return { today, week, month };
}

function isAfter(value: Date | string | undefined, start: Date) {
  if (!value) return false;
  return new Date(value).getTime() >= start.getTime();
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}
