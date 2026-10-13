import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { OrderStatus } from './enums/order-status.enum';
import { Order, type OrderDocument } from './schemas/order.schema';

const PAGE_SIZE = 20;
const HISTORY_STATUSES = [
  OrderStatus.PENDING_REVIEW,
  OrderStatus.CONFIRMED,
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
];
const SUMMARY_FIELDS = {
  _id: 1,
  reference: 1,
  status: 1,
  currency: 1,
  totalItems: 1,
  subtotal: 1,
  createdAt: 1,
} as const;

type SummaryOrder = Pick<
  Order,
  'reference' | 'status' | 'currency' | 'totalItems' | 'subtotal'
> & { _id: Types.ObjectId; createdAt: Date };

type HistoryOrder = SummaryOrder & Pick<Order, 'items' | 'shippingAddress'>;
type TrackingOrder = SummaryOrder &
  Pick<Order, 'confirmedAt' | 'cancelledAt' | 'completedAt'>;

export interface CustomerOrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  currency: string;
  totalItems: number;
  subtotal: number;
  createdAt: string;
}

export interface CustomerOrderHistory {
  orders: CustomerOrderSummary[];
  nextCursor: string | null;
}

export interface CustomerOrderTracking extends CustomerOrderSummary {
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}

@Injectable()
export class CustomerOrderHistoryService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async list(
    user: JwtPayload,
    cursor?: unknown,
  ): Promise<CustomerOrderHistory> {
    const filters = this.ownedFilters(user);
    if (cursor !== undefined) {
      const position = this.decodeCursor(cursor);
      filters.$or = [
        { createdAt: { $lt: position.date } },
        { createdAt: position.date, _id: { $lt: position.id } },
      ];
    }

    const records = await this.orderModel
      .find(filters)
      .select(SUMMARY_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .limit(PAGE_SIZE + 1)
      .lean<HistoryOrder[]>()
      .exec();
    const orders = records.slice(0, PAGE_SIZE);
    const last = orders.at(-1);

    return {
      orders: orders.map((order) => this.summary(order)),
      nextCursor:
        records.length > PAGE_SIZE && last ? this.encodeCursor(last) : null,
    };
  }

  async detail(user: JwtPayload, id: string) {
    const filters = this.ownedFilters(user);
    if (!/^[a-f\d]{24}$/i.test(id)) {
      throw new NotFoundException('No encontramos ese pedido en tu cuenta.');
    }

    const order = await this.orderModel
      .findOne({ ...filters, _id: new Types.ObjectId(id) })
      .select({
        ...SUMMARY_FIELDS,
        'items.productId': 1,
        'items.productName': 1,
        'items.presentation': 1,
        'items.image': 1,
        'items.quantity': 1,
        'items.unitPrice': 1,
        'items.subtotal': 1,
        'items.currency': 1,
        'shippingAddress.label': 1,
        'shippingAddress.recipientName': 1,
        'shippingAddress.phone': 1,
        'shippingAddress.street': 1,
        'shippingAddress.exteriorNumber': 1,
        'shippingAddress.interiorNumber': 1,
        'shippingAddress.neighborhood': 1,
        'shippingAddress.municipality': 1,
        'shippingAddress.state': 1,
        'shippingAddress.postalCode': 1,
        'shippingAddress.references': 1,
      })
      .lean<HistoryOrder>()
      .exec();

    if (!order) {
      throw new NotFoundException('No encontramos ese pedido en tu cuenta.');
    }

    const address = order.shippingAddress;
    return {
      ...this.summary(order),
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        presentation: item.presentation,
        image: item.image,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        currency: item.currency,
      })),
      shippingAddress: address
        ? {
            label: address.label,
            recipientName: address.recipientName,
            phone: address.phone,
            street: address.street,
            exteriorNumber: address.exteriorNumber,
            interiorNumber: address.interiorNumber,
            neighborhood: address.neighborhood,
            municipality: address.municipality,
            state: address.state,
            postalCode: address.postalCode,
            references: address.references,
          }
        : null,
    };
  }

  async tracking(user: JwtPayload, id: string): Promise<CustomerOrderTracking> {
    const filters = this.ownedFilters(user);
    if (!/^[a-f\d]{24}$/i.test(id)) {
      throw new NotFoundException('No encontramos ese pedido en tu cuenta.');
    }

    const order = await this.orderModel
      .findOne({ ...filters, _id: new Types.ObjectId(id) })
      .select({
        ...SUMMARY_FIELDS,
        confirmedAt: 1,
        cancelledAt: 1,
        completedAt: 1,
      })
      .lean<TrackingOrder>()
      .exec();

    if (!order) {
      throw new NotFoundException('No encontramos ese pedido en tu cuenta.');
    }

    return {
      ...this.summary(order),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
    };
  }

  private ownedFilters(user: JwtPayload): Record<string, unknown> {
    // Never fall back to a matching contact email: an order belongs to its account.
    if (!user || typeof user.sub !== 'string' || !user.sub.trim()) {
      throw new UnauthorizedException();
    }
    return { customerUserId: user.sub, status: { $in: HISTORY_STATUSES } };
  }

  private summary(order: SummaryOrder): CustomerOrderSummary {
    return {
      id: order._id.toHexString(),
      reference: order.reference,
      status: order.status,
      currency: order.currency,
      totalItems: order.totalItems,
      subtotal: order.subtotal,
      createdAt: order.createdAt.toISOString(),
    };
  }

  private encodeCursor(order: SummaryOrder): string {
    return Buffer.from(
      JSON.stringify({
        v: 1,
        date: order.createdAt.toISOString(),
        id: order._id.toHexString(),
      }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: unknown): { date: Date; id: Types.ObjectId } {
    const invalid = () =>
      new BadRequestException('El cursor del historial no es válido.');
    if (
      typeof cursor !== 'string' ||
      cursor.length === 0 ||
      cursor.length > 256 ||
      !/^[A-Za-z0-9_-]+$/.test(cursor)
    ) {
      throw invalid();
    }

    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
        throw invalid();
      }
      const position = decoded as Record<string, unknown>;
      if (
        position.v !== 1 ||
        Object.keys(position).sort().join(',') !== 'date,id,v' ||
        typeof position.date !== 'string' ||
        typeof position.id !== 'string' ||
        !/^[a-f\d]{24}$/.test(position.id)
      ) {
        throw invalid();
      }
      const date = new Date(position.date);
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== position.date
      ) {
        throw invalid();
      }
      const id = new Types.ObjectId(position.id);
      if (
        this.encodeCursor({ _id: id, createdAt: date } as SummaryOrder) !==
        cursor
      ) {
        throw invalid();
      }
      return { date, id };
    } catch {
      throw invalid();
    }
  }
}
