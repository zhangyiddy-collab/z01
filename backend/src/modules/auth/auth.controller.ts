import { Body, Controller, Post, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class WechatLoginDto {
  @IsString()
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  login(@Body() dto: WechatLoginDto, @Req() req: { ip?: string; headers: Record<string, string> }) {
    return this.authService.wechatLogin(dto.code, req.ip, req.headers['user-agent']);
  }
}

