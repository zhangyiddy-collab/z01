import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { OrderEntity, OrderStatus, PaymentEntity, PaymentLogEntity, PaymentStatus } from '../../database/entities';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
  ) {}

  async wechatPrepay(userId: string, orderId: string) {
    const order = await this.orders.findOneBy({ id: orderId, userId });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING_PAYMENT) throw new BadRequestException('订单状态不可支付');

    const payment =
      (await this.payments.findOneBy({ outTradeNo: order.orderNo })) ||
      (await this.payments.save({
        orderId: order.id,
        orderNo: order.orderNo,
        outTradeNo: order.orderNo,
        amount: order.payableAmount,
        status: PaymentStatus.INIT,
      }));

    return {
      outTradeNo: payment.outTradeNo,
      amount: payment.amount,
      // 生产环境在这里请求微信支付 v3 /v3/pay/transactions/jsapi 并签名返回。
      payParams: {
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: payment.outTradeNo,
        package: `prepay_id=mock_${payment.outTradeNo}`,
        signType: 'RSA',
        paySign: 'replace_with_wechatpay_signature',
      },
    };
  }

  async handleWechatNotify(body: Record<string, unknown>, headers: Record<string, string>) {
    const resource = body.resource as Record<string, unknown> | undefined;
    const plain = resource?.ciphertext ? this.mockDecryptResource(resource) : body;
    const outTradeNo = String(plain.out_trade_no || plain.outTradeNo || '');
    const transactionId = String(plain.transaction_id || plain.transactionId || '');
    const paidAmount = Number((plain.amount as { total?: number } | undefined)?.total || plain.amount || 0);

    if (!outTradeNo) throw new BadRequestException('缺少 out_trade_no');
    const lockKey = `pay:notify:${outTradeNo}`;
    if (!(await this.redis.lock(lockKey, 30))) return { code: 'SUCCESS', message: 'duplicate' };

    try {
      await this.dataSource.transaction(async (manager) => {
        const payment = await manager.findOneBy(PaymentEntity, { outTradeNo });
        if (!payment || payment.status === PaymentStatus.SUCCESS) return;
        const order = await manager.findOneBy(OrderEntity, { id: payment.orderId });
        if (!order) throw new NotFoundException('订单不存在');
        if (paidAmount && paidAmount !== order.payableAmount) throw new BadRequestException('支付金额不一致');

        payment.status = PaymentStatus.SUCCESS;
        payment.transactionId = transactionId || payment.transactionId;
        payment.rawNotify = body;
        order.status = OrderStatus.PAID;
        order.paidAmount = order.payableAmount;
        order.paidAt = new Date();
        await manager.save(PaymentEntity, payment);
        await manager.save(OrderEntity, order);
        await manager.save(PaymentLogEntity, {
          orderNo: order.orderNo,
          outTradeNo,
          eventType: 'WECHAT_NOTIFY_SUCCESS',
          payload: { headers, body },
        });
      });
    } finally {
      await this.redis.unlock(lockKey);
    }

    return { code: 'SUCCESS', message: '成功' };
  }

  async mockSuccess(userId: string, orderId: string) {
    if (process.env.NODE_ENV === 'production') throw new BadRequestException('生产环境禁止模拟支付');
    const order = await this.orders.findOneBy({ id: orderId, userId });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING_PAYMENT) return { ok: true, order };

    await this.wechatPrepay(userId, orderId);
    return this.handleWechatNotify(
      {
        outTradeNo: order.orderNo,
        transactionId: `mock_${Date.now()}`,
        amount: order.payableAmount,
      },
      { 'x-mock-pay': '1' },
    );
  }

  private mockDecryptResource(resource: Record<string, unknown>) {
    return resource;
  }
}
