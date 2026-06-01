import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { LoginLogEntity, UserEntity } from '../../database/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(LoginLogEntity) private readonly loginLogs: Repository<LoginLogEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async wechatLogin(code: string, ip?: string, userAgent?: string) {
    const openid = await this.fetchOpenid(code);
    let user = await this.users.findOneBy({ openid });
    if (!user) user = await this.users.save({ openid });
    await this.loginLogs.save({ userId: user.id, openid, ip, userAgent });
    return { token: this.jwtService.sign({ id: user.id, openid }), user };
  }

  private async fetchOpenid(code: string): Promise<string> {
    if (process.env.NODE_ENV !== 'production') return 'dev_tester';
    const { data } = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WECHAT_APPID,
        secret: process.env.WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });
    if (!data.openid) throw new Error(data.errmsg || '微信登录失败');
    return data.openid;
  }
}
