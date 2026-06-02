import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserEntity, CartEntity, OrderEntity, OrderItemEntity, OrderLogEntity, PaymentEntity, PaymentLogEntity, ProductEntity } from '../../database/entities';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUserEntity, ProductEntity, CartEntity, OrderEntity, OrderItemEntity, OrderLogEntity, PaymentEntity, PaymentLogEntity])],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
  exports: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
