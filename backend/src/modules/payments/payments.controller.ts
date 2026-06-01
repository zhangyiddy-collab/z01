import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('wechat/prepay/:orderId')
  @UseGuards(JwtAuthGuard)
  prepay(@CurrentUser() user: CurrentUser, @Param('orderId') orderId: string) {
    return this.paymentsService.wechatPrepay(user.id, orderId);
  }

  @Post('wechat/notify')
  notify(@Body() body: Record<string, unknown>, @Headers() headers: Record<string, string>) {
    return this.paymentsService.handleWechatNotify(body, headers);
  }

  @Post('mock-success/:orderId')
  @UseGuards(JwtAuthGuard)
  mockSuccess(@CurrentUser() user: CurrentUser, @Param('orderId') orderId: string) {
    return this.paymentsService.mockSuccess(user.id, orderId);
  }
}
