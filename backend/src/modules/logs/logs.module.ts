import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExceptionLogEntity, LoginLogEntity, OrderLogEntity, PaymentLogEntity } from '../../database/entities';
import { LogsController } from './logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoginLogEntity, OrderLogEntity, PaymentLogEntity, ExceptionLogEntity])],
  controllers: [LogsController],
})
export class LogsModule {}

