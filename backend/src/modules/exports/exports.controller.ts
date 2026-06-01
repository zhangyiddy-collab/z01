import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';

@Controller('admin/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('purchase.xlsx')
  async purchaseExcel(@Res() res: Response) {
    const buffer = await this.exportsService.purchaseExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase.xlsx');
    res.send(buffer);
  }

  @Get('delivery.pdf')
  async deliveryPdf(@Res() res: Response) {
    const buffer = await this.exportsService.deliveryPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=delivery.pdf');
    res.send(buffer);
  }
}

