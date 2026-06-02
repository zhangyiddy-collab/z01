import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { DatabaseBackupService } from '../../database/database-backup.service';
import { AddressEntity, CartEntity, OrderEntity, OrderItemEntity, OrderLogEntity, ProductEntity } from '../../database/entities';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, OrderLogEntity, ProductEntity, CartEntity, AddressEntity]), PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService, RedisService, DatabaseBackupService],
  exports: [OrdersService],
})
export class OrdersModule {}
