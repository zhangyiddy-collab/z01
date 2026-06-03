import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { DatabaseBackupService } from '../../database/database-backup.service';
import {
  AddressEntity,
  CartEntity,
  OrderEntity,
  OrderItemEntity,
  OrderLogEntity,
  OrderStatus,
  ProductEntity,
  ProductStatus,
} from '../../database/entities';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly databaseBackup: DatabaseBackupService,
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity) private readonly orderItems: Repository<OrderItemEntity>,
  ) {}

  list(userId: string) {
    return this.orders.find({ where: { userId, userDeletedAt: IsNull() }, order: { id: 'DESC' } });
  }

  async detail(userId: string, id: string) {
    const order = await this.orders.findOneBy({ userId, id, userDeletedAt: IsNull() });
    if (!order) throw new NotFoundException('订单不存在');
    const items = await this.orderItems.findBy({ orderId: id });
    return { ...order, items: items.map((item) => ({ ...item, productCoverUrl: this.absoluteUrl(item.productCoverUrl) })) };
  }

  async removeForUser(userId: string, id: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOneBy(OrderEntity, { userId, id, userDeletedAt: IsNull() });
      if (!order) throw new NotFoundException('订单不存在');

      const fromStatus = order.status;
      if (order.status === OrderStatus.PENDING_PAYMENT) {
        order.status = OrderStatus.CANCELLED;
      }
      order.userDeletedAt = new Date();
      await manager.save(OrderEntity, order);
      await manager.save(OrderLogEntity, {
        orderId: order.id,
        orderNo: order.orderNo,
        fromStatus,
        toStatus: order.status,
        operatorType: 'USER',
        operatorId: userId,
        remark: '用户删除订单记录',
      });
      return { ok: true };
    });
    await this.databaseBackup.snapshot('order-delete');
    return result;
  }

  async create(userId: string, addressId: string, productIds: string[], remark?: string) {
    const lockKey = `order:submit:${userId}`;
    if (!(await this.redis.lock(lockKey, 5))) throw new BadRequestException('请勿重复提交');

    try {
      const orderRemark = this.normalizeRemark(remark);
      const order = await this.dataSource.transaction(async (manager) => {
        const address = await manager.findOneBy(AddressEntity, { id: addressId, userId });
        if (!address) throw new BadRequestException('请选择有效地址');

        const carts = await manager.find(CartEntity, { where: { userId, productId: In(productIds) } });
        const cartMap = new Map(carts.map((item) => [String(item.productId), item]));
        const checkoutItems = productIds.map((productId) => ({
          productId,
          quantity: cartMap.get(String(productId))?.quantity || 1,
        }));
        if (checkoutItems.length === 0) throw new BadRequestException('请选择商品');

        const products = await manager.find(ProductEntity, { where: { id: In(checkoutItems.map((item) => item.productId)) } });
        const productMap = new Map(products.map((product) => [String(product.id), product]));

        let productAmount = 0;
        const orderNo = this.generateOrderNo();
        const order = await manager.save(OrderEntity, {
          orderNo,
          userId,
          addressId,
          status: OrderStatus.PENDING_PAYMENT,
          productAmount: 0,
          deliveryFee: 0,
          payableAmount: 0,
          remark: orderRemark,
        });

        for (const item of checkoutItems) {
          const product = productMap.get(String(item.productId));
          if (!product || product.status !== ProductStatus.ON_SALE) throw new BadRequestException('商品已下架');

          const updateResult = await manager
            .createQueryBuilder()
            .update(ProductEntity)
            .set({ sales: () => `sales + ${item.quantity}`, version: () => 'version + 1' })
            .where('id = :id AND version = :version', {
              id: product.id,
              version: product.version,
            })
            .execute();

          if (!updateResult.affected) throw new BadRequestException(`${product.name} 暂时无法下单，请重试`);

          const totalPrice = product.price * item.quantity;
          productAmount += totalPrice;
          await manager.save(OrderItemEntity, {
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            productCoverUrl: product.coverUrl,
            unitPrice: product.price,
            quantity: item.quantity,
            totalPrice,
          });
        }

        order.productAmount = productAmount;
        order.payableAmount = productAmount + order.deliveryFee;
        await manager.save(OrderEntity, order);
        await manager.delete(CartEntity, { userId, productId: In(productIds) });
        await manager.save(OrderLogEntity, {
          orderId: order.id,
          orderNo,
          toStatus: OrderStatus.PENDING_PAYMENT,
          operatorType: 'USER',
          operatorId: userId,
          remark: '用户提交订单',
        });
        const items = await manager.findBy(OrderItemEntity, { orderId: order.id });
        return { ...order, items: items.map((item) => ({ ...item, productCoverUrl: this.absoluteUrl(item.productCoverUrl) })) };
      });
      await this.databaseBackup.snapshot('order-create');
      return order;
    } finally {
      await this.redis.unlock(lockKey);
    }
  }

  async directCheckout(userId: string, addressId: string, productId: string, quantity = 1, remark?: string) {
    return this.createFromItems(userId, addressId, [{ productId, quantity: Math.max(1, Number(quantity) || 1) }], remark, '直接结算');
  }

  private async createFromItems(
    userId: string,
    addressId: string,
    checkoutItems: Array<{ productId: string; quantity: number }>,
    remark?: string,
    logRemark = '用户提交订单',
  ) {
    const lockKey = `order:direct:${userId}`;
    if (!(await this.redis.lock(lockKey, 5))) throw new BadRequestException('请勿重复提交');

    try {
      const orderRemark = this.normalizeRemark(remark);
      const order = await this.dataSource.transaction(async (manager) => {
        const address = await manager.findOneBy(AddressEntity, { id: addressId, userId });
        if (!address) throw new BadRequestException('请选择有效地址');
        if (!checkoutItems.length) throw new BadRequestException('请选择商品');

        const products = await manager.find(ProductEntity, { where: { id: In(checkoutItems.map((item) => item.productId)) } });
        const productMap = new Map(products.map((product) => [String(product.id), product]));
        let productAmount = 0;
        const orderNo = this.generateOrderNo();
        const order = await manager.save(OrderEntity, {
          orderNo,
          userId,
          addressId,
          status: OrderStatus.PENDING_PAYMENT,
          productAmount: 0,
          deliveryFee: 0,
          payableAmount: 0,
          remark: orderRemark,
        });

        for (const item of checkoutItems) {
          const product = productMap.get(String(item.productId));
          if (!product || product.status !== ProductStatus.ON_SALE) throw new BadRequestException('商品已下架');
          await manager
            .createQueryBuilder()
            .update(ProductEntity)
            .set({ sales: () => `sales + ${item.quantity}`, version: () => 'version + 1' })
            .where('id = :id', { id: product.id })
            .execute();
          const totalPrice = product.price * item.quantity;
          productAmount += totalPrice;
          await manager.save(OrderItemEntity, {
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            productCoverUrl: product.coverUrl,
            unitPrice: product.price,
            quantity: item.quantity,
            totalPrice,
          });
        }

        order.productAmount = productAmount;
        order.payableAmount = productAmount + order.deliveryFee;
        await manager.save(OrderEntity, order);
        await manager.save(OrderLogEntity, {
          orderId: order.id,
          orderNo,
          toStatus: OrderStatus.PENDING_PAYMENT,
          operatorType: 'USER',
          operatorId: userId,
          remark: logRemark,
        });
        const items = await manager.findBy(OrderItemEntity, { orderId: order.id });
        return { ...order, items: items.map((item) => ({ ...item, productCoverUrl: this.absoluteUrl(item.productCoverUrl) })) };
      });
      await this.databaseBackup.snapshot('order-direct-checkout');
      return order;
    } finally {
      await this.redis.unlock(lockKey);
    }
  }

  private generateOrderNo() {
    const time = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return `${time}${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private normalizeRemark(remark?: string) {
    const text = String(remark || '').trim();
    return text ? text.slice(0, 255) : undefined;
  }

  private absoluteUrl(url: string) {
    if (/^https?:\/\//i.test(url)) return url;
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000';
    return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }
}
