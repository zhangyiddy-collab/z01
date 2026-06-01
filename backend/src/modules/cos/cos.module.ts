import { Module } from '@nestjs/common';
import { CosController } from './cos.controller';
import { CosService } from './cos.service';

@Module({
  controllers: [CosController],
  providers: [CosService],
})
export class CosModule {}

