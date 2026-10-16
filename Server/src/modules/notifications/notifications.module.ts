import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WebPushController } from './web-push.controller';
import { WebPushService } from './web-push.service';
import {
  WebPushSubscription,
  WebPushSubscriptionSchema,
} from './schemas/web-push-subscription.schema';
import {
  CustomerNotification,
  CustomerNotificationSchema,
} from './schemas/customer-notification.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CustomerNotification.name, schema: CustomerNotificationSchema },
      { name: WebPushSubscription.name, schema: WebPushSubscriptionSchema },
    ]),
  ],
  controllers: [NotificationsController, WebPushController],
  providers: [NotificationsService, WebPushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
