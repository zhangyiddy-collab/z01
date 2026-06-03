import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { existsSync } from 'fs';
import PDFDocument = require('pdfkit');
import { Repository } from 'typeorm';
import { AddressEntity, OrderEntity, OrderItemEntity, OrderStatus } from '../../database/entities';

export type PeriodKey = 'today' | 'week' | 'month';

export interface PurchaseRow {
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  orderNos: string[];
}

export interface PurchasePeriod {
  key: PeriodKey;
  label: string;
  orderCount: number;
  itemCount: number;
  paidAmount: number;
  rows: PurchaseRow[];
}

export interface DeliveryTicket {
  order: OrderEntity;
  address?: AddressEntity;
  items: OrderItemEntity[];
  itemCount: number;
}

export interface DeliveryGroup {
  addressKey: string;
  address?: AddressEntity;
  tickets: DeliveryTicket[];
  orderCount: number;
  itemCount: number;
}

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.PURCHASING, OrderStatus.DELIVERING, OrderStatus.COMPLETED];
const DELIVERY_STATUSES = [OrderStatus.PAID, OrderStatus.PURCHASING, OrderStatus.DELIVERING];

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly items: Repository<OrderItemEntity>,
    @InjectRepository(AddressEntity) private readonly addresses: Repository<AddressEntity>,
  ) {}

  async purchasePeriods(): Promise<PurchasePeriod[]> {
    const orders = await this.orders.find({ order: { id: 'DESC' } });
    const paidOrders = orders.filter((order) => PAID_STATUSES.includes(order.status));
    const ranges = periodRanges();
    return Promise.all([
      this.purchasePeriod('today', '今日采购单', paidOrders, ranges.today),
      this.purchasePeriod('week', '本周采购单', paidOrders, ranges.week),
      this.purchasePeriod('month', '本月采购单', paidOrders, ranges.month),
    ]);
  }

  async purchaseRows(period: PeriodKey = 'month'): Promise<PurchaseRow[]> {
    const selected = (await this.purchasePeriods()).find((item) => item.key === period);
    return selected?.rows || [];
  }

  async purchaseExcel(period: PeriodKey = 'month') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Purchase');
    sheet.columns = [
      { header: '商品', key: 'productName', width: 32 },
      { header: '单价', key: 'unitPrice', width: 12 },
      { header: '采购数量', key: 'quantity', width: 12 },
      { header: '小计', key: 'totalPrice', width: 12 },
      { header: '关联订单', key: 'orderNos', width: 42 },
    ];
    const rows = await this.purchaseRows(period);
    rows.forEach((row) =>
      sheet.addRow({
        productName: row.productName,
        unitPrice: (row.unitPrice / 100).toFixed(2),
        quantity: row.quantity,
        totalPrice: (row.totalPrice / 100).toFixed(2),
        orderNos: row.orderNos.join(', '),
      }),
    );
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  async deliveryTickets(): Promise<DeliveryTicket[]> {
    const orders = await this.orders.find({ order: { id: 'DESC' } });
    const deliveryOrders = orders.filter((order) => DELIVERY_STATUSES.includes(order.status));
    const tickets: DeliveryTicket[] = [];
    for (const order of deliveryOrders) {
      const [items, address] = await Promise.all([
        this.items.findBy({ orderId: order.id }),
        this.addresses.findOneBy({ id: order.addressId }),
      ]);
      tickets.push({
        order,
        address: address || undefined,
        items,
        itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      });
    }
    return tickets.sort(compareDeliveryTickets);
  }

  async deliveryGroups(): Promise<DeliveryGroup[]> {
    const tickets = await this.deliveryTickets();
    const groups = new Map<string, DeliveryGroup>();
    for (const ticket of tickets) {
      const key = deliveryAddressKey(ticket.address);
      const group =
        groups.get(key) ||
        ({
          addressKey: key,
          address: ticket.address,
          tickets: [],
          orderCount: 0,
          itemCount: 0,
        } satisfies DeliveryGroup);
      group.tickets.push(ticket);
      group.orderCount += 1;
      group.itemCount += ticket.itemCount;
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.addressKey.localeCompare(b.addressKey, 'zh-CN'));
  }

  async deliveryPdf(): Promise<Buffer> {
    const groups = await this.deliveryGroups();
    const doc = new PDFDocument({ size: [226, 640], margin: 12 });
    this.tryUseChineseFont(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    if (!groups.length) {
      doc.fontSize(14).text('KS同款代购配送单', { align: 'center' });
      doc.moveDown().fontSize(10).text('暂无可配送订单', { align: 'center' });
    }

    groups.forEach((group, index) => {
      if (index > 0) doc.addPage({ size: [226, 640], margin: 12 });
      this.renderDeliveryGroup(doc, group);
    });
    doc.end();
    return done;
  }

  private async purchasePeriod(key: PeriodKey, label: string, orders: OrderEntity[], start?: Date): Promise<PurchasePeriod> {
    const periodOrders = orders.filter((order) => !start || isAfter(order.paidAt || order.createdAt, start));
    const rows = await this.aggregatePurchaseRows(periodOrders);
    return {
      key,
      label,
      orderCount: periodOrders.length,
      itemCount: rows.reduce((sum, row) => sum + row.quantity, 0),
      paidAmount: periodOrders.reduce((sum, order) => sum + Number(order.paidAmount || order.payableAmount || 0), 0),
      rows,
    };
  }

  private async aggregatePurchaseRows(orders: OrderEntity[]) {
    const map = new Map<string, PurchaseRow>();
    for (const order of orders) {
      const items = await this.items.findBy({ orderId: order.id });
      for (const item of items) {
        const key = `${item.productName}::${item.unitPrice}`;
        const row =
          map.get(key) ||
          ({
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: 0,
            totalPrice: 0,
            orderNos: [],
          } satisfies PurchaseRow);
        row.quantity += Number(item.quantity || 0);
        row.totalPrice += Number(item.totalPrice || 0);
        if (!row.orderNos.includes(order.orderNo)) row.orderNos.push(order.orderNo);
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity || a.productName.localeCompare(b.productName));
  }

  private renderDeliveryGroup(doc: PDFKit.PDFDocument, group: DeliveryGroup) {
    const { address, tickets } = group;
    doc.fontSize(14).text('KS同款代购', { align: 'center' });
    doc.fontSize(11).text('同址配送单', { align: 'center' });
    this.hr(doc);
    doc.fontSize(11).text(addressText(address));
    doc.fontSize(9).text(`订单: ${group.orderCount} 单  件数: ${group.itemCount}`);
    this.hr(doc);
    tickets.forEach((ticket, index) => {
      const { order, items } = ticket;
      if (index > 0) this.hr(doc);
      doc.fontSize(9).text(`订单号: ${order.orderNo}`);
      doc.text(`状态: ${statusText(order.status)}  时间: ${formatDate(order.paidAt || order.createdAt)}`);
      doc.fontSize(10).text(`${ticket.address?.name || '-'}  ${ticket.address?.phone || ''}`);
      items.forEach((item) => {
        doc.fontSize(10).text(`${item.productName}`);
        doc.text(`  x${item.quantity}`);
      });
      if (order.remark) doc.moveDown(0.5).fontSize(10).text(`备注: ${order.remark}`);
    });
    this.hr(doc);
    doc.moveDown().fontSize(8).text('请核对商品后配送', { align: 'center' });
  }

  private hr(doc: PDFKit.PDFDocument) {
    const y = doc.y + 6;
    doc.moveTo(12, y).lineTo(214, y).dash(2, { space: 2 }).strokeColor('#999').stroke().undash();
    doc.moveDown();
  }

  private tryUseChineseFont(doc: PDFKit.PDFDocument) {
    const candidates = ['C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf', 'C:/Windows/Fonts/simsun.ttc'];
    const font = candidates.find((item) => existsSync(item));
    if (!font) return;
    try {
      doc.font(font);
    } catch {
      // PDF still renders with default font if the host does not support the font file.
    }
  }
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

export function money(value: number) {
  return (Number(value || 0) / 100).toFixed(2);
}

export function formatDate(value?: Date) {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function addressText(address?: AddressEntity) {
  if (!address) return '地址缺失';
  return `${address.communityName || ''}${address.buildingNo}栋 ${address.unitNo}单元 ${address.roomNo}`;
}

function compareDeliveryTickets(a: DeliveryTicket, b: DeliveryTicket) {
  const addressCompare = deliveryAddressKey(a.address).localeCompare(deliveryAddressKey(b.address), 'zh-CN');
  if (addressCompare !== 0) return addressCompare;

  const timeCompare = deliveryOrderTime(b.order) - deliveryOrderTime(a.order);
  if (timeCompare !== 0) return timeCompare;

  return Number(b.order.id || 0) - Number(a.order.id || 0);
}

function deliveryAddressKey(address?: AddressEntity) {
  if (!address) return '~~~~missing-address';
  return [
    normalizeAddressPart(address.communityName),
    normalizeAddressPart(address.buildingNo),
    normalizeAddressPart(address.unitNo),
    normalizeAddressPart(address.roomNo),
  ].join('|');
}

function normalizeAddressPart(value?: string) {
  return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

function deliveryOrderTime(order: OrderEntity) {
  return new Date(order.paidAt || order.createdAt || 0).getTime() || 0;
}

export function statusText(status: string) {
  return (
    {
      PENDING_PAYMENT: '待支付',
      PAID: '已支付',
      PURCHASING: '采购中',
      DELIVERING: '配送中',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
      REFUNDED: '已退款',
    } as Record<string, string>
  )[status] || status;
}
