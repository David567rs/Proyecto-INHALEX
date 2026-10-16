import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import {
  PushEndpointDto,
  SavePushSubscriptionDto,
} from './dto/push-subscription.dto';
import { WebPushService } from './web-push.service';

@Controller('notifications/push')
export class WebPushController {
  constructor(private readonly push: WebPushService) {}

  @Get('config')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  configuration() {
    return this.push.configuration();
  }

  @Post('status')
  @UseGuards(JwtAuthGuard)
  status(@Req() request: AuthenticatedRequest, @Body() input: PushEndpointDto) {
    return this.push.status(request.user.sub, input.endpoint);
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @Req() request: AuthenticatedRequest,
    @Body() input: SavePushSubscriptionDto,
  ) {
    return this.push.subscribe(request.user.sub, input);
  }

  @Delete('subscriptions')
  @UseGuards(JwtAuthGuard)
  unsubscribe(
    @Req() request: AuthenticatedRequest,
    @Body() input: PushEndpointDto,
  ) {
    return this.push.unsubscribe(request.user.sub, input.endpoint);
  }
}
