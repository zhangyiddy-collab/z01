import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CartService } from './cart.service';

class AddCartDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  list(@CurrentUser() user: CurrentUser) {
    return this.cartService.list(user.id);
  }

  @Post()
  add(@CurrentUser() user: CurrentUser, @Body() dto: AddCartDto) {
    return this.cartService.add(user.id, dto.productId, dto.quantity);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: CurrentUser, @Param('productId') productId: string) {
    return this.cartService.remove(user.id, productId);
  }
}

