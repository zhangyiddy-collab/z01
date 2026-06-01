import { Injectable } from '@nestjs/common';

@Injectable()
export class CosService {
  uploadPolicy() {
    return {
      bucket: process.env.COS_BUCKET,
      region: process.env.COS_REGION,
      prefix: `products/${new Date().toISOString().slice(0, 10)}/`,
    };
  }
}

