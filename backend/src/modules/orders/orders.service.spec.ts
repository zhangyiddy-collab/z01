import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { OrderEntity, OrderItemEntity } from '../../database/entities';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  it('rejects duplicate submit by redis lock', async () => {
    const service = await makeService(false);
    await expect(service.create('1', '1', ['1'])).rejects.toBeInstanceOf(BadRequestException);
  });
});

async function makeService(lockResult: boolean) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OrdersService,
      { provide: RedisService, useValue: { lock: jest.fn().mockResolvedValue(lockResult), unlock: jest.fn() } },
      { provide: DataSource, useValue: { transaction: jest.fn() } },
      { provide: getRepositoryToken(OrderEntity), useValue: { find: jest.fn(), findOneBy: jest.fn() } },
      { provide: getRepositoryToken(OrderItemEntity), useValue: { findBy: jest.fn() } },
    ],
  }).compile();

  return moduleRef.get(OrdersService);
}
