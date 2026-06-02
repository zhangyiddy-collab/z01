import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { OrderEntity, OrderItemEntity, OrderLogEntity, OrderStatus } from '../../database/entities';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  it('rejects duplicate submit by redis lock', async () => {
    const service = await makeService(false);
    await expect(service.create('1', '1', ['1'])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides a paid order for the user without cancelling it', async () => {
    const order = { id: '10', orderNo: 'NO10', userId: '1', status: OrderStatus.PAID } as OrderEntity;
    const manager = {
      findOneBy: jest.fn().mockResolvedValue(order),
      save: jest.fn(),
    };
    const service = await makeService(true, { transaction: jest.fn((callback) => callback(manager)) });

    await expect(service.removeForUser('1', '10')).resolves.toEqual({ ok: true });

    expect(order.status).toBe(OrderStatus.PAID);
    expect(order.userDeletedAt).toBeInstanceOf(Date);
    expect(manager.save).toHaveBeenCalledWith(OrderEntity, order);
    expect(manager.save).toHaveBeenCalledWith(
      OrderLogEntity,
      expect.objectContaining({
        orderId: '10',
        fromStatus: OrderStatus.PAID,
        toStatus: OrderStatus.PAID,
        operatorType: 'USER',
        remark: '用户删除订单记录',
      }),
    );
  });

  it('cancels an unpaid order when the user deletes it', async () => {
    const order = { id: '11', orderNo: 'NO11', userId: '1', status: OrderStatus.PENDING_PAYMENT } as OrderEntity;
    const manager = {
      findOneBy: jest.fn().mockResolvedValue(order),
      save: jest.fn(),
    };
    const service = await makeService(true, { transaction: jest.fn((callback) => callback(manager)) });

    await service.removeForUser('1', '11');

    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(order.userDeletedAt).toBeInstanceOf(Date);
  });
});

async function makeService(lockResult: boolean, dataSource = { transaction: jest.fn() }) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrdersService,
      { provide: RedisService, useValue: { lock: jest.fn().mockResolvedValue(lockResult), unlock: jest.fn() } },
      { provide: DataSource, useValue: dataSource },
      { provide: getRepositoryToken(OrderEntity), useValue: { find: jest.fn(), findOneBy: jest.fn() } },
      { provide: getRepositoryToken(OrderItemEntity), useValue: { findBy: jest.fn() } },
    ],
  }).compile();

  return moduleRef.get(OrdersService);
}
