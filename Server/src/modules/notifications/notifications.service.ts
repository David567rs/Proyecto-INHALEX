import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CustomerNotification,
  CustomerNotificationDocument,
  CustomerNotificationSeverity,
  CustomerNotificationType,
} from './schemas/customer-notification.schema';

export interface CreateCustomerNotificationInput {
  userId?: string;
  userEmail: string;
  title: string;
  message: string;
  type?: CustomerNotificationType;
  severity?: CustomerNotificationSeverity;
  metadata?: Record<string, unknown>;
}

export interface CustomerNotificationResponse {
  id: string;
  userId?: string;
  userEmail: string;
  title: string;
  message: string;
  type: CustomerNotificationType;
  severity: CustomerNotificationSeverity;
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  createdAt?: string;
}

export interface CustomerNotificationsResponse {
  items: CustomerNotificationResponse[];
  unread: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(CustomerNotification.name)
    private readonly notificationModel: Model<CustomerNotificationDocument>,
  ) {}

  async createForUser(
    input: CreateCustomerNotificationInput,
  ): Promise<CustomerNotificationResponse | null> {
    const userEmail = input.userEmail.trim().toLowerCase();
    if (!userEmail) {
      return null;
    }

    const notification = await this.notificationModel.create({
      userId: input.userId,
      userEmail,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type ?? CustomerNotificationType.SYSTEM,
      severity: input.severity ?? CustomerNotificationSeverity.INFO,
      metadata: input.metadata ?? {},
    });

    return this.mapNotification(notification);
  }

  async listForUser(
    user: JwtPayload,
    limit = 12,
  ): Promise<CustomerNotificationsResponse> {
    const filters = this.buildUserFilters(user);
    const safeLimit = Math.max(1, Math.min(limit, 40));

    const [items, unread] = await Promise.all([
      this.notificationModel
        .find(filters)
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .exec(),
      this.notificationModel
        .countDocuments({ ...filters, readAt: null })
        .exec(),
    ]);

    return {
      items: items.map((item) => this.mapNotification(item)),
      unread,
    };
  }

  async markRead(
    user: JwtPayload,
    notificationId: string,
  ): Promise<CustomerNotificationResponse> {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification id');
    }

    const notification = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: notificationId,
          ...this.buildUserFilters(user),
        },
        { $set: { readAt: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    return this.mapNotification(notification);
  }

  async markAllRead(user: JwtPayload): Promise<{ updated: number }> {
    const result = await this.notificationModel
      .updateMany(
        { ...this.buildUserFilters(user), readAt: null },
        { $set: { readAt: new Date() } },
      )
      .exec();

    return { updated: result.modifiedCount };
  }

  private buildUserFilters(user: JwtPayload) {
    return {
      $or: [
        { userId: user.sub },
        { userEmail: user.email.trim().toLowerCase() },
      ],
    };
  }

  private mapNotification(
    notification: CustomerNotificationDocument,
  ): CustomerNotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      userEmail: notification.userEmail,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      severity: notification.severity,
      metadata: notification.metadata,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt?.toISOString(),
    };
  }
}
