import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @Transform(({ value }) => String(value || ''))
  @IsString()
  addressId!: string;

  @Transform(({ value }) => (Array.isArray(value) ? value.map((item) => String(item)) : []))
  @IsArray()
  productIds!: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}

class DirectCheckoutDto {
  @Transform(({ value }) => String(value || ''))
  @IsString()
  addressId!: string;

  @Transform(({ value }) => String(value || ''))
  @IsString()
  productId!: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUser) {
    return this.ordersService.list(user.id);
  }

  @Get(':id')
  detail(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.ordersService.detail(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto.addressId, dto.productIds, dto.remark);
  }

  @Post('checkout')
  async checkout(@CurrentUser() user: CurrentUser, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(user.id, dto.addressId, dto.productIds, dto.remark);
    await this.paymentsService.mockSuccess(user.id, order.id);
    return this.ordersService.detail(user.id, order.id);
  }

  @Post('direct-checkout')
  async directCheckout(@CurrentUser() user: CurrentUser, @Body() dto: DirectCheckoutDto) {
    const order = await this.ordersService.directCheckout(user.id, dto.addressId, dto.productId);
    await this.paymentsService.mockSuccess(user.id, order.id);
    return this.ordersService.detail(user.id, order.id);
  }
}
