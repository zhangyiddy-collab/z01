import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { OrderEntity, OrderItemEntity, OrderStatus } from '../../database/entities';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly items: Repository<OrderItemEntity>,
  ) {}

  async purchaseExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('采购单');
    sheet.columns = [
      { header: '订单号', key: 'orderNo', width: 24 },
      { header: '商品', key: 'productName', width: 32 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单价(分)', key: 'unitPrice', width: 12 },
    ];

    const orders = await this.orders.find({ where: { status: OrderStatus.PAID } });
    for (const order of orders) {
      const items = await this.items.findBy({ orderId: order.id });
      items.forEach((item) => sheet.addRow({ orderNo: order.orderNo, ...item }));
    }
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }

  async deliveryPdf(): Promise<Buffer> {
    const orders = await this.orders.find({ where: { status: OrderStatus.DELIVERING }, order: { id: 'DESC' } });
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
    doc.fontSize(18).text('KS同款代购配送单');
    orders.forEach((order) => doc.moveDown().fontSize(11).text(`${order.orderNo}  金额:${order.payableAmount}分  状态:${order.status}`));
    doc.end();
    return done;
  }
}
