import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { OrderEntity, PaymentEntity, PaymentLogEntity } from '../../database/entities';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity, PaymentLogEntity, OrderEntity])],
  controllers: [PaymentsController],
  providers: [PaymentsService, RedisService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
