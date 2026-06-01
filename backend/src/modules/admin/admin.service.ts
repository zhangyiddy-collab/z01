import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CartEntity, OrderEntity, OrderItemEntity, OrderLogEntity, OrderStatus, PaymentEntity, PaymentLogEntity, ProductEntity, ProductStatus } from '../../database/entities';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
  ) {}

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

  async financeStats() {
    const paid = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(o.paid_amount),0)', 'paidAmount')
      .where('o.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.PURCHASING, OrderStatus.DELIVERING, OrderStatus.COMPLETED] })
      .getRawOne<{ orderCount: string; paidAmount: string }>();

    return {
      orderCount: Number(paid?.orderCount || 0),
      paidAmount: Number(paid?.paidAmount || 0),
    };
  }
}
