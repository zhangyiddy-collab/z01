import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressEntity, OrderEntity, OrderItemEntity } from '../../database/entities';
import { AdminModule } from '../admin/admin.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, AddressEntity]), AdminModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
