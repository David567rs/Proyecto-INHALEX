import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  CustomerNotification,
  CustomerNotificationSchema,
} from './schemas/customer-notification.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CustomerNotification.name, schema: CustomerNotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
