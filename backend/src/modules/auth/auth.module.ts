import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginLogEntity, UserEntity } from '../../database/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, LoginLogEntity]),
    JwtModule.register({ secret: process.env.JWT_SECRET || 'dev_secret', signOptions: { expiresIn: '30d' } }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
