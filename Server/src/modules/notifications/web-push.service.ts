import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createECDH } from 'node:crypto';
import * as webPush from 'web-push';
import type { SavePushSubscriptionDto } from './dto/push-subscription.dto';
import {
  pushEndpointHash,
  validatePushEndpoint,
  validatePushKeys,
} from './push-endpoint';
import {
  WebPushSubscription,
  WebPushSubscriptionDocument,
} from './schemas/web-push-subscription.schema';

const MAX_DEVICES = 20;
const SUBSCRIPTION_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    @InjectModel(WebPushSubscription.name)
    private readonly subscriptions: Model<WebPushSubscriptionDocument>,
    private readonly config: ConfigService,
  ) {}

  private vapidDetails(): NonNullable<
    webPush.RequestOptions['vapidDetails']
  > | null {
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim();
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    if (!subject || !publicKey || !privateKey) return null;
    try {
      const contact = new URL(subject);
      const validContact =
        (contact.protocol === 'mailto:' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.pathname)) ||
        (contact.protocol === 'https:' &&
          contact.hostname.includes('.') &&
          !contact.username &&
          !contact.password);
      if (
        !validContact ||
        !/^[A-Za-z0-9_-]{87}$/.test(publicKey) ||
        !/^[A-Za-z0-9_-]{43}$/.test(privateKey)
      )
        return null;
      const curve = createECDH('prime256v1');
      curve.setPrivateKey(Buffer.from(privateKey, 'base64url'));
      if (curve.getPublicKey().toString('base64url') !== publicKey) return null;
      return { subject, publicKey, privateKey };
    } catch {
      return null;
    }
  }

  configuration(): { enabled: boolean; publicKey: string | null } {
    const vapid = this.vapidDetails();
    return { enabled: Boolean(vapid), publicKey: vapid?.publicKey ?? null };
  }

  async status(
    userId: string,
    rawEndpoint: string,
  ): Promise<{ subscribed: boolean }> {
    const endpointHash = pushEndpointHash(validatePushEndpoint(rawEndpoint));
    const subscription = await this.subscriptions.exists({
      userId,
      endpointHash,
      expiresAt: { $gt: new Date() },
    });
    return { subscribed: Boolean(subscription) };
  }

  async subscribe(
    userId: string,
    input: SavePushSubscriptionDto,
  ): Promise<{ subscribed: true }> {
    if (!this.vapidDetails())
      throw new ServiceUnavailableException(
        'Las notificaciones aún no están configuradas.',
      );
    const endpoint = validatePushEndpoint(input.endpoint);
    validatePushKeys(input.keys);
    const endpointHash = pushEndpointHash(endpoint);
    const existing = await this.subscriptions.findOne({ endpointHash }).exec();
    if (
      existing &&
      (existing.p256dh !== input.keys.p256dh ||
        existing.auth !== input.keys.auth)
    ) {
      throw new BadRequestException(
        'Renueva la suscripción desde este navegador.',
      );
    }
    if (
      existing?.userId !== userId &&
      (await this.subscriptions.countDocuments({ userId }).exec()) >=
        MAX_DEVICES
    ) {
      throw new BadRequestException(
        'Alcanzaste el límite de dispositivos de esta cuenta.',
      );
    }
    const expiresAt = new Date(
      Math.min(
        input.expirationTime ?? Infinity,
        Date.now() + SUBSCRIPTION_LIFETIME_MS,
      ),
    );
    if (expiresAt.getTime() <= Date.now())
      throw new BadRequestException('La suscripción ha caducado.');
    await this.subscriptions
      .findOneAndUpdate(
        { endpointHash },
        {
          $set: {
            userId,
            endpoint,
            endpointHash,
            p256dh: input.keys.p256dh,
            auth: input.keys.auth,
            expiresAt,
          },
        },
        { upsert: true, runValidators: true },
      )
      .exec();
    return { subscribed: true };
  }

  async unsubscribe(
    userId: string,
    rawEndpoint: string,
  ): Promise<{ subscribed: false }> {
    const endpointHash = pushEndpointHash(validatePushEndpoint(rawEndpoint));
    await this.subscriptions.deleteOne({ userId, endpointHash }).exec();
    return { subscribed: false };
  }

  /** A push transport outage must never reject an order, review or account event. */
  async notifyAccount(userId: string): Promise<void> {
    const vapidDetails = this.vapidDetails();
    if (!vapidDetails) return;
    try {
      const subscriptions = await this.subscriptions
        .find({ userId, expiresAt: { $gt: new Date() } })
        .limit(MAX_DEVICES)
        .exec();
      const payload = JSON.stringify({
        title: 'INHALEX',
        body: 'Tienes una nueva actualización en tu cuenta.',
        url: '/cuenta',
        tag: 'inhalex-account',
      });
      await Promise.allSettled(
        subscriptions.map(async (subscription) => {
          try {
            // Validate stored records too, before the first outbound request.
            const endpoint = validatePushEndpoint(subscription.endpoint);
            await webPush.sendNotification(
              {
                endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              payload,
              {
                vapidDetails,
                TTL: 300,
                urgency: 'normal',
                topic: 'inhalex-account',
                timeout: 5000,
              },
            );
          } catch (error: unknown) {
            const status =
              error && typeof error === 'object' && 'statusCode' in error
                ? error.statusCode
                : null;
            if (status === 404 || status === 410) {
              // A delayed failure cannot delete a subscription rebound to another account.
              await this.subscriptions
                .deleteOne({
                  _id: subscription._id,
                  userId,
                  endpointHash: subscription.endpointHash,
                })
                .exec();
            } else {
              // Never log endpoints, encryption keys, payloads or provider error objects.
              this.logger.warn('No se pudo entregar una notificación web.');
            }
          }
        }),
      );
    } catch {
      this.logger.warn('No se pudieron consultar las suscripciones web.');
    }
  }
}
