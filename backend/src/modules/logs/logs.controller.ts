import { Controller, Get } from '@nestjs/common';

@Controller('admin/logs')
export class LogsController {
  @Get()
  index() {
    return {
      login: '/api/admin/logs/login',
      order: '/api/admin/logs/order',
      payment: '/api/admin/logs/payment',
      exception: '/api/admin/logs/exception',
    };
  }
}

