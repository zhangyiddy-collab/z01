import { Controller, Get, Header, Query, Redirect, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AdminRole } from '../../database/entities';
import { AdminRoles } from '../admin/admin-auth.decorators';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { addressText, ExportsService, formatDate, money, PeriodKey, PurchasePeriod, statusText } from './exports.service';

@UseGuards(AdminAuthGuard)
@AdminRoles(AdminRole.ADMIN)
@Controller('admin/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('purchase')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async purchaseHtml() {
    const periods = await this.exportsService.purchasePeriods();
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>采购单</title>${purchaseStyle()}</head><body><main>
<div class="toolbar no-print">
  <div><h1>采购单</h1><p>今日 / 本周 / 本月统计，表格可直接打印。</p></div>
  <div class="actions"><button onclick="window.print()">打印</button><a href="/api/admin">返回后台</a></div>
</div>
${periods.map((period) => renderPurchaseSection(period)).join('')}
</main></body></html>`;
  }

  @Get('purchase.xlsx')
  @Redirect('/api/admin/exports/purchase', 302)
  purchaseOldLink() {
    return;
  }

  @Get('purchase.download.xlsx')
  async purchaseExcel(@Res() res: Response, @Query('period') period?: PeriodKey) {
    const selected = ['today', 'week', 'month'].includes(String(period)) ? period : 'month';
    const buffer = await this.exportsService.purchaseExcel(selected as PeriodKey);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=purchase-${selected}.xlsx`);
    res.send(buffer);
  }

  @Get('delivery')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async deliveryHtml() {
    const groups = await this.exportsService.deliveryGroups();
    const body = groups.length
      ? groups
          .map(
            (group) => `<section class="ticket">
      <h2>KS同款代购</h2>
      <h3>同址配送单</h3>
      <div class="line"></div>
      <p class="address">${escapeHtml(addressText(group.address))}</p>
      <p><b>订单</b> ${group.orderCount} 单　<b>件数</b> ${group.itemCount}</p>
      <div class="line"></div>
      ${group.tickets
        .map(
          (ticket, index) => `<div class="order-block">
        ${index > 0 ? '<div class="thin-line"></div>' : ''}
        <p><b>订单号</b> ${escapeHtml(ticket.order.orderNo)}</p>
        <p><b>状态</b> ${statusText(ticket.order.status)}　<b>时间</b> ${formatDate(ticket.order.paidAt || ticket.order.createdAt)}</p>
        <p class="customer">${escapeHtml(ticket.address?.name || '-')} ${escapeHtml(ticket.address?.phone || '')}</p>
        ${ticket.items
          .map(
            (item) => `<div class="item">
        <span>${escapeHtml(item.productName)}</span>
        <b>x${item.quantity}</b>
      </div>`,
          )
          .join('')}
        ${ticket.order.remark ? `<p><b>备注</b> ${escapeHtml(ticket.order.remark)}</p>` : ''}
      </div>`,
        )
        .join('')}
      <p class="foot">请核对商品后配送</p>
    </section>`,
          )
          .join('')
      : '<section class="ticket"><h2>KS同款代购</h2><p class="empty">暂无可配送订单</p></section>';
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>配送单</title>${deliveryStyle()}</head><body>
<div class="toolbar no-print"><div><h1>配送单</h1><p>同一住址已合并到同一张配送单</p></div><div class="actions"><button onclick="window.print()">打印</button><a href="/api/admin/exports/delivery.pdf">下载 PDF</a><form method="post" action="/api/admin/logout"><button type="submit">退出登录</button></form></div></div>
<main>${body}</main></body></html>`;
  }

  @Get('delivery.pdf')
  async deliveryPdf(@Res() res: Response) {
    const buffer = await this.exportsService.deliveryPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=delivery.pdf');
    res.send(buffer);
  }
}

function renderPurchaseSection(period: PurchasePeriod) {
  const rows = period.rows.length
    ? period.rows
        .map(
          (row, index) => `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.productName)}</td>
      <td>¥${money(row.unitPrice)}</td>
      <td>${row.quantity}</td>
      <td>¥${money(row.totalPrice)}</td>
      <td>${escapeHtml(row.orderNos.join('、'))}</td>
    </tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="empty">暂无数据</td></tr>';
  return `<section class="sheet">
    <div class="sheet-head">
      <div><h2>${period.label}</h2><p>订单 ${period.orderCount} 单，采购 ${period.itemCount} 件，已付 ¥${money(period.paidAmount)}</p></div>
      <a class="download no-print" href="/api/admin/exports/purchase.download.xlsx?period=${period.key}">下载 Excel</a>
    </div>
    <table>
      <thead><tr><th>#</th><th>商品</th><th>单价</th><th>采购数量</th><th>小计</th><th>关联订单</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function purchaseStyle() {
  return `<style>
body{margin:0;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:1120px;margin:0 auto;padding:24px 18px 48px}
.toolbar,.sheet-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.toolbar{max-width:1120px;margin:0 auto;padding:22px 18px}.toolbar h1,.sheet h2{margin:0}.toolbar p,.sheet p{margin:6px 0 0;color:#64748b}
a,button{display:inline-block;padding:10px 14px;border:0;border-radius:6px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700;cursor:pointer}
.actions{display:flex;gap:10px}.sheet{margin-bottom:24px;padding:18px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;break-inside:avoid}
table{width:100%;margin-top:14px;border-collapse:collapse}th,td{padding:10px;border:1px solid #d1d5db;text-align:left;font-size:13px}th{background:#f1f5f9}.empty{text-align:center;color:#94a3b8}
@media print{body{background:#fff}.no-print{display:none!important}main{max-width:none;padding:0}.sheet{border:0;margin:0 0 18px;padding:0;page-break-inside:avoid}th,td{font-size:12px;padding:7px}.sheet h2{font-size:18px}}
</style>`;
}

function deliveryStyle() {
  return `<style>
body{margin:0;background:#f7f8fa;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;max-width:860px;margin:0 auto;padding:20px 18px;flex-wrap:wrap}
.toolbar h1{margin:0}.toolbar p{margin:6px 0 0;color:#64748b}.toolbar .actions{display:flex;gap:10px;flex-wrap:wrap}a,button{padding:10px 14px;border:0;border-radius:6px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700}
main{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:0 18px 48px}.ticket{width:80mm;min-height:140mm;padding:14px;background:#fff;border:1px solid #d1d5db;color:#111;box-sizing:border-box;break-inside:avoid}
.ticket h2,.ticket h3{text-align:center;margin:0}.ticket h2{font-size:18px}.ticket h3{font-size:14px;margin-top:4px}.ticket p{margin:6px 0;font-size:13px}.address{font-size:16px!important;font-weight:900}.customer{font-size:15px!important;font-weight:800}
.line{border-top:1px dashed #111;margin:10px 0}.thin-line{border-top:1px dotted #64748b;margin:10px 0}.order-block{break-inside:avoid}.item{display:grid;grid-template-columns:1fr auto;gap:8px;margin:7px 0;font-size:13px}.foot{text-align:center;color:#64748b}.empty{text-align:center;padding:40px 0}
@media print{body{background:#fff}.no-print{display:none!important}main{display:block;padding:0}.ticket{width:80mm;border:0;margin:0 auto 8mm;page-break-after:always}}
</style>`;
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}
