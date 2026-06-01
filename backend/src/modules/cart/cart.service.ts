import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity, ProductEntity } from '../../database/entities';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity) private readonly carts: Repository<CartEntity>,
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
  ) {}

  list(userId: string) {
    return this.carts.find({ where: { userId }, relations: ['product'], order: { id: 'DESC' } });
  }

  async add(userId: string, productId: string, quantity: number) {
    const product = await this.products.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('商品不存在');
    const exists = await this.carts.findOneBy({ userId, productId });
    if (exists) return this.carts.save({ ...exists, quantity });
    return this.carts.save({ userId, productId, quantity });
  }

  async remove(userId: string, productId: string) {
    await this.carts.delete({ userId, productId });
    return { ok: true };
  }
}

