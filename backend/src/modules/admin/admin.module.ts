import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity, OrderEntity, OrderItemEntity, OrderLogEntity, PaymentEntity, PaymentLogEntity, ProductEntity } from '../../database/entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, CartEntity, OrderEntity, OrderItemEntity, OrderLogEntity, PaymentEntity, PaymentLogEntity])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
