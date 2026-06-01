import { Controller, Get } from '@nestjs/common';
import { CosService } from './cos.service';

@Controller('cos')
export class CosController {
  constructor(private readonly cosService: CosService) {}

  @Get('upload-policy')
  uploadPolicy() {
    return this.cosService.uploadPolicy();
  }
}

