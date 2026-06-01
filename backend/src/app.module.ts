import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CosModule } from './modules/cos/cos.module';
import { ExportsModule } from './modules/exports/exports.module';
import { LogsModule } from './modules/logs/logs.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RedisService } from './common/utils/redis.service';
import { AddressEntity, ExceptionLogEntity, ProductEntity, UserEntity, entities } from './database/entities';
import { LocalSeedService } from './database/local-seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(
      process.env.DB_TYPE === 'sqljs'
        ? {
            type: 'sqljs',
            entities,
            synchronize: true,
            location: process.env.SQLJS_DB_PATH || 'local-test.sqlite',
            autoSave: true,
            autoSaveCallback: (data: Uint8Array) => {
              if (process.env.NODE_ENV !== 'production') {
                const { writeFileSync } = require('fs') as typeof import('fs');
                writeFileSync(process.env.SQLJS_DB_PATH || 'local-test.sqlite', Buffer.from(data));
              }
            },
            logging: false,
          }
        : {
            type: 'mysql',
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities,
            synchronize: false,
            logging: process.env.NODE_ENV !== 'production',
          },
    ),
    TypeOrmModule.forFeature([ExceptionLogEntity, ProductEntity, UserEntity, AddressEntity]),
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    PaymentsModule,
    AdminModule,
    LogsModule,
    ExportsModule,
    CosModule,
  ],
  controllers: [AppController],
  providers: [RedisService, AllExceptionsFilter, LocalSeedService],
})
export class AppModule {}
