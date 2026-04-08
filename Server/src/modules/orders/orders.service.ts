import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InventoryMovementType } from '../products/enums/inventory-movement-type.enum';
import { ProductStatus } from '../products/enums/product-status.enum';
import {
  ProductInventoryMovement,
  ProductInventoryMovementDocument,
} from '../products/schemas/product-inventory-movement.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UserStatus } from '../users/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDraftDto } from './dto/create-order-draft.dto';
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto';
import { OrderDraftItemDto } from './dto/order-draft-item.dto';
import { PreviewOrderDraftDto } from './dto/preview-order-draft.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from './enums/order-status.enum';
import {
  Order,
  OrderDocument,
  OrderIssueSeverity,
  OrderItemFulfillment,
} from './schemas/order.schema';

export interface DraftOrderIssue {
  code: string;
  severity: OrderIssueSeverity;
  productId?: string;
  productName?: string;
  title: string;
  description: string;
}

export interface OrderPreviewItem {
  productId: string;
  productName: string;
  productSlug: string;
  image: string;
  category: string;
  presentation: string;
  origin: string;
  unitPrice: number;
  currency: string;
  requestedQuantity: number;
  quantity: number;
  subtotal: number;
  fulfillment: OrderItemFulfillment;
  stockAvailable?: number | null;
  reservedQuantity: number;
  backorderQuantity: number;
  inventoryTracked: boolean;
  allowBackorder: boolean;
  message?: string;
}

export interface OrderPreviewResponse {
  items: OrderPreviewItem[];
  issues: DraftOrderIssue[];
  subtotal: number;
  totalItems: number;
  currency: string;
  canCreateDraft: boolean;
  canConfirmOrder: boolean;
  needsManualReview: boolean;
  signature: string;
}

export interface CreatedDraftOrderResponse extends OrderPreviewResponse {
  orderId: string;
  reference: string;
  status: OrderStatus;
  createdAt?: string;
}

export interface ConfirmedOrderResponse extends OrderPreviewResponse {
  orderId: string;
  reference: string;
  status: OrderStatus;
  createdAt?: string;
}

export interface AdminOrderStatusNoteResponse {
  status: OrderStatus;
  note: string;
  actorId?: string;
  actorEmail?: string;
  createdAt: string;
}

export interface AdminOrderListItemResponse {
  id: string;
  reference: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalItems: number;
  subtotal: number;
  currency: string;
  needsManualReview: boolean;
  createdAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
}

export interface AdminOrderDetailResponse extends AdminOrderListItemResponse {
  channel: string;
  customerNotes?: string;
  customerUserId?: string;
  customerUserEmail?: string;
  items: OrderPreviewItem[];
  issues: DraftOrderIssue[];
  statusNotes: AdminOrderStatusNoteResponse[];
  lastValidatedAt?: string;
}

export interface AdminOrdersResponse {
  items: AdminOrderListItemResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: Record<OrderStatus, number> & {
    manualReview: number;
  };
}

interface InventoryAvailability {
  tracked: boolean;
  available: number;
  allowBackorder: boolean;
}

interface ResolvedOrderItemResult {
  item?: OrderPreviewItem;
  issue?: DraftOrderIssue;
}

interface OrderPreviewComputation {
  items: OrderPreviewItem[];
  issues: DraftOrderIssue[];
  subtotal: number;
  totalItems: number;
  currency: string;
  canCreateDraft: boolean;
  canConfirmOrder: boolean;
  needsManualReview: boolean;
}

interface OrderActorSnapshot {
  userId?: string;
  email?: string;
}

interface AppliedInventoryMutation {
  productId: string;
  productName: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductInventoryMovement.name)
    private readonly inventoryMovementModel: Model<ProductInventoryMovementDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async previewDraft(
    previewOrderDraftDto: PreviewOrderDraftDto,
  ): Promise<OrderPreviewResponse> {
    const computed = await this.computePreview(previewOrderDraftDto.items);
    return this.attachSignature(computed);
  }

  async createDraft(
    createOrderDraftDto: CreateOrderDraftDto,
    authorization?: string,
  ): Promise<CreatedDraftOrderResponse> {
    const preview = await this.previewDraft({ items: createOrderDraftDto.items });

    if (!preview.items.length) {
      throw new BadRequestException(
        'La bolsa no tiene productos validos para preparar un pedido',
      );
    }

    const linkedUser = await this.resolveOrderingUser(authorization);
    const order = await this.orderModel.create({
      reference: this.buildDraftReference(),
      status: OrderStatus.DRAFT,
      currency: preview.currency,
      totalItems: preview.totalItems,
      subtotal: preview.subtotal,
      items: preview.items,
      issues: preview.issues,
      customer: {
        name: createOrderDraftDto.customerName.trim(),
        email: createOrderDraftDto.customerEmail.trim().toLowerCase(),
        phone: createOrderDraftDto.customerPhone.trim(),
        notes: createOrderDraftDto.notes?.trim() || undefined,
      },
      customerUserId: linkedUser?.userId,
      customerUserEmail: linkedUser?.email,
      needsManualReview: preview.needsManualReview,
      channel: 'web_public',
      lastValidatedAt: new Date(),
      statusNotes: [
        this.buildStatusNote(
          OrderStatus.DRAFT,
          'Borrador preparado desde la bolsa publica.',
          linkedUser ?? undefined,
        ),
      ],
    });

    return {
      ...preview,
      orderId: order.id,
      reference: order.reference,
      status: order.status,
      createdAt: order.createdAt?.toISOString(),
    };
  }

  async confirmOrder(
    confirmOrderDto: ConfirmOrderDto,
    authorization?: string,
  ): Promise<ConfirmedOrderResponse> {
    const preview = await this.previewDraft({ items: confirmOrderDto.items });

    if (!preview.items.length || !preview.canConfirmOrder) {
      throw new BadRequestException(
        'La bolsa ya no tiene productos validos para confirmar un pedido',
      );
    }

    if (confirmOrderDto.previewSignature !== preview.signature) {
      throw new ConflictException(
        'El inventario cambio mientras confirmabas tu pedido. Actualizamos la bolsa para que revises la disponibilidad mas reciente.',
      );
    }

    const linkedUser = await this.resolveOrderingUser(authorization);
    const orderReference = this.buildConfirmedReference();
    const actor = {
      userId: linkedUser?.userId,
      email: linkedUser?.email ?? confirmOrderDto.customerEmail.trim().toLowerCase(),
    };
    const reservedMutations: AppliedInventoryMutation[] = [];

    try {
      for (const item of preview.items) {
        if (item.reservedQuantity <= 0) {
          continue;
        }

        await this.reserveInventoryForItem(item, orderReference, actor);
        reservedMutations.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.reservedQuantity,
        });
      }

      const order = await this.orderModel.create({
        reference: orderReference,
        status: OrderStatus.PENDING_REVIEW,
        currency: preview.currency,
        totalItems: preview.totalItems,
        subtotal: preview.subtotal,
        items: preview.items,
        issues: preview.issues,
        customer: {
          name: confirmOrderDto.customerName.trim(),
          email: confirmOrderDto.customerEmail.trim().toLowerCase(),
          phone: confirmOrderDto.customerPhone.trim(),
          notes: confirmOrderDto.notes?.trim() || undefined,
        },
        customerUserId: linkedUser?.userId,
        customerUserEmail: linkedUser?.email,
        needsManualReview: preview.needsManualReview,
        channel: 'web_public',
        lastValidatedAt: new Date(),
        statusNotes: [
          this.buildStatusNote(
            OrderStatus.PENDING_REVIEW,
            preview.needsManualReview
              ? 'Pedido confirmado desde la web y enviado a revision manual.'
              : 'Pedido confirmado desde la web y pendiente de revision comercial.',
            actor,
          ),
        ],
      });

      await this.inventoryMovementModel
        .updateMany(
          { orderReference, orderId: { $exists: false } },
          { $set: { orderId: order.id } },
        )
        .exec();

      return {
        ...preview,
        orderId: order.id,
        reference: order.reference,
        status: order.status,
        createdAt: order.createdAt?.toISOString(),
      };
    } catch (error) {
      if (reservedMutations.length > 0) {
        await this.rollbackReservedInventory(reservedMutations, orderReference, actor);
      }
      throw error;
    }
  }

  async listAdminOrders(
    query: ListAdminOrdersQueryDto,
  ): Promise<AdminOrdersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const filters = this.buildAdminOrderFilters(query);

    const [orders, total, statusCounts, manualReview] = await Promise.all([
      this.orderModel
        .find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filters).exec(),
      this.orderModel.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.orderModel.countDocuments({ ...filters, needsManualReview: true }).exec(),
    ]);

    const countsByStatus = new Map(statusCounts.map((item) => [item._id, item.count]));

    return {
      items: orders.map((order) => this.mapAdminOrderListItem(order)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        [OrderStatus.DRAFT]: countsByStatus.get(OrderStatus.DRAFT) ?? 0,
        [OrderStatus.PENDING_REVIEW]:
          countsByStatus.get(OrderStatus.PENDING_REVIEW) ?? 0,
        [OrderStatus.CONFIRMED]: countsByStatus.get(OrderStatus.CONFIRMED) ?? 0,
        [OrderStatus.CANCELLED]: countsByStatus.get(OrderStatus.CANCELLED) ?? 0,
        [OrderStatus.COMPLETED]: countsByStatus.get(OrderStatus.COMPLETED) ?? 0,
        manualReview,
      },
    };
  }

  async getAdminOrder(id: string): Promise<AdminOrderDetailResponse> {
    const order = await this.findOrderOrThrow(id);
    return this.mapAdminOrderDetail(order);
  }

  async updateOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    actor: JwtPayload,
  ): Promise<AdminOrderDetailResponse> {
    const order = await this.findOrderOrThrow(id);
    const targetStatus = updateOrderStatusDto.status;

    this.assertOrderTransition(order.status, targetStatus);

    switch (targetStatus) {
      case OrderStatus.CONFIRMED:
        return this.confirmReviewedOrder(order, updateOrderStatusDto.note, actor);
      case OrderStatus.CANCELLED:
        return this.cancelOrder(order, updateOrderStatusDto.note, actor);
      case OrderStatus.COMPLETED:
        return this.completeOrder(order, updateOrderStatusDto.note, actor);
      default:
        throw new BadRequestException('Este cambio de estado no esta permitido');
    }
  }

  private async confirmReviewedOrder(
    order: OrderDocument,
    note: string | undefined,
    actor: JwtPayload,
  ): Promise<AdminOrderDetailResponse> {
    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { _id: order._id, status: OrderStatus.PENDING_REVIEW },
        {
          $set: {
            status: OrderStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
          $push: {
            statusNotes: this.buildStatusNote(
              OrderStatus.CONFIRMED,
              note?.trim() || 'Pedido revisado y confirmado por el equipo.',
              actor,
            ),
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .exec();

    if (!updatedOrder) {
      throw new ConflictException(
        'El pedido cambio de estado mientras lo estabas actualizando. Recarga la lista e intenta de nuevo.',
      );
    }

    return this.mapAdminOrderDetail(updatedOrder);
  }

  private async cancelOrder(
    order: OrderDocument,
    note: string | undefined,
    actor: JwtPayload,
  ): Promise<AdminOrderDetailResponse> {
    const releasableItems = order.items
      .filter((item) => item.reservedQuantity > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.reservedQuantity,
      }));

    const releasedMutations: AppliedInventoryMutation[] = [];

    try {
      for (const item of releasableItems) {
        await this.releaseInventoryQuantity(
          item.productId,
          item.productName,
          item.quantity,
          {
            type: InventoryMovementType.RELEASE,
            orderId: order.id,
            orderReference: order.reference,
            note: `Liberacion por cancelacion del pedido ${order.reference}.`,
            actor,
          },
        );
        releasedMutations.push(item);
      }

      const updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { _id: order._id, status: order.status },
          {
            $set: {
              status: OrderStatus.CANCELLED,
              cancelledAt: new Date(),
            },
            $push: {
              statusNotes: this.buildStatusNote(
                OrderStatus.CANCELLED,
                note?.trim() || 'Pedido cancelado por el equipo.',
                actor,
              ),
            },
          },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .exec();

      if (!updatedOrder) {
        await this.reReserveReleasedInventory(
          releasedMutations,
          order.reference,
          actor,
        );
        throw new ConflictException(
          'El pedido cambio de estado mientras lo estabas cancelando. Recarga la lista e intenta de nuevo.',
        );
      }

      return this.mapAdminOrderDetail(updatedOrder);
    } catch (error) {
      if (releasedMutations.length > 0) {
        await this.reReserveReleasedInventory(
          releasedMutations,
          order.reference,
          actor,
        );
      }
      throw error;
    }
  }

  private async completeOrder(
    order: OrderDocument,
    note: string | undefined,
    actor: JwtPayload,
  ): Promise<AdminOrderDetailResponse> {
    const committedMutations = order.items
      .filter((item) => item.reservedQuantity > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.reservedQuantity,
      }));

    const completedMutations: AppliedInventoryMutation[] = [];

    try {
      for (const item of committedMutations) {
        await this.commitReservedInventory(
          item.productId,
          item.productName,
          item.quantity,
          {
            orderId: order.id,
            orderReference: order.reference,
            actor,
          },
        );
        completedMutations.push(item);
      }

      const updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { _id: order._id, status: order.status },
          {
            $set: {
              status: OrderStatus.COMPLETED,
              completedAt: new Date(),
            },
            $push: {
              statusNotes: this.buildStatusNote(
                OrderStatus.COMPLETED,
                note?.trim() || 'Pedido marcado como completado.',
                actor,
              ),
            },
          },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .exec();

      if (!updatedOrder) {
        await this.restoreCommittedInventory(
          completedMutations,
          order.reference,
          actor,
        );
        throw new ConflictException(
          'El pedido cambio de estado mientras lo estabas completando. Recarga la lista e intenta de nuevo.',
        );
      }

      return this.mapAdminOrderDetail(updatedOrder);
    } catch (error) {
      if (completedMutations.length > 0) {
        await this.restoreCommittedInventory(
          completedMutations,
          order.reference,
          actor,
        );
      }
      throw error;
    }
  }

  private async computePreview(
    items: OrderDraftItemDto[],
  ): Promise<OrderPreviewComputation> {
    const normalizedRequests = this.mergeRequestedItems(items);
    const requestedIds = normalizedRequests.map((item) => item.productId);

    const products = await this.productModel
      .find({
        _id: { $in: requestedIds },
        status: ProductStatus.ACTIVE,
      })
      .select(
        'name slug image category presentation origin price currency inStock stockAvailable allowBackorder',
      )
      .exec();

    const productsById = new Map(products.map((product) => [product.id, product]));
    const issues: DraftOrderIssue[] = [];
    const previewItems: OrderPreviewItem[] = [];

    for (const request of normalizedRequests) {
      const product = productsById.get(request.productId);
      if (!product) {
        issues.push({
          code: 'product_not_found',
          severity: OrderIssueSeverity.ERROR,
          productId: request.productId,
          title: 'Producto no disponible',
          description:
            'Uno de los productos ya no esta disponible en el catalogo publico y fue retirado de la bolsa.',
        });
        continue;
      }

      const result = this.resolveRequestedItem(product, request.quantity);
      if (result.item) {
        previewItems.push(result.item);
      }
      if (result.issue) {
        issues.push(result.issue);
      }
    }

    return {
      items: previewItems,
      issues,
      subtotal: previewItems.reduce((sum, item) => sum + item.subtotal, 0),
      totalItems: previewItems.reduce((sum, item) => sum + item.quantity, 0),
      currency: previewItems[0]?.currency ?? 'MXN',
      canCreateDraft: previewItems.length > 0,
      canConfirmOrder: previewItems.length > 0,
      needsManualReview: previewItems.some(
        (item) =>
          item.fulfillment === OrderItemFulfillment.BACKORDER ||
          item.fulfillment === OrderItemFulfillment.MANUAL,
      ),
    };
  }

  private attachSignature(
    preview: OrderPreviewComputation,
  ): OrderPreviewResponse {
    return {
      ...preview,
      signature: this.buildPreviewSignature(preview),
    };
  }

  private mergeRequestedItems(items: OrderDraftItemDto[]): OrderDraftItemDto[] {
    const quantityById = new Map<string, number>();

    for (const item of items) {
      if (!Types.ObjectId.isValid(item.productId)) {
        throw new BadRequestException('Uno de los productos enviados es invalido');
      }

      quantityById.set(
        item.productId,
        (quantityById.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return Array.from(quantityById.entries()).map(([productId, quantity]) => ({
      productId,
      quantity: Math.min(quantity, 25),
    }));
  }

  private resolveRequestedItem(
    product: ProductDocument,
    requestedQuantity: number,
  ): ResolvedOrderItemResult {
    const inventory = this.readAvailability(product);
    let quantity = requestedQuantity;
    let fulfillment = OrderItemFulfillment.AVAILABLE;
    let message: string | undefined;
    let issue: DraftOrderIssue | undefined;
    let reservedQuantity = 0;
    let backorderQuantity = 0;

    if (!inventory.tracked) {
      if (!product.inStock && !inventory.allowBackorder) {
        return {
          issue: {
            code: 'out_of_stock',
            severity: OrderIssueSeverity.ERROR,
            productId: product.id,
            productName: product.name,
            title: 'Producto sin existencias',
            description: `${product.name} ya no esta disponible y fue retirado de la bolsa.`,
          },
        };
      }

      fulfillment = OrderItemFulfillment.MANUAL;
      message =
        'Este aroma aun no tiene stock inicializado y sera confirmado manualmente por el equipo.';
      issue = {
        code: 'manual_inventory_review',
        severity: OrderIssueSeverity.INFO,
        productId: product.id,
        productName: product.name,
        title: 'Validacion manual',
        description: `${product.name} aun no tiene existencias inicializadas. El pedido se puede confirmar, pero requiere revision manual.`,
      };
    } else if (inventory.available <= 0) {
      if (inventory.allowBackorder) {
        fulfillment = OrderItemFulfillment.BACKORDER;
        backorderQuantity = requestedQuantity;
        message =
          'Disponible bajo pedido. El equipo confirmara tiempos antes de finalizar la compra.';
        issue = {
          code: 'backorder_only',
          severity: OrderIssueSeverity.WARNING,
          productId: product.id,
          productName: product.name,
          title: 'Disponible bajo pedido',
          description: `${product.name} no tiene existencias inmediatas, pero puede prepararse bajo pedido.`,
        };
      } else {
        return {
          issue: {
            code: 'out_of_stock',
            severity: OrderIssueSeverity.ERROR,
            productId: product.id,
            productName: product.name,
            title: 'Producto sin existencias',
            description: `${product.name} ya no tiene existencias disponibles y fue retirado de la bolsa.`,
          },
        };
      }
    } else if (requestedQuantity > inventory.available) {
      if (inventory.allowBackorder) {
        fulfillment = OrderItemFulfillment.BACKORDER;
        reservedQuantity = inventory.available;
        backorderQuantity = requestedQuantity - inventory.available;
        message = `Reservaremos ${inventory.available} unidades de inmediato. El resto quedara bajo pedido.`;
        issue = {
          code: 'partial_backorder',
          severity: OrderIssueSeverity.WARNING,
          productId: product.id,
          productName: product.name,
          title: 'Parte del pedido sera bajo pedido',
          description: `${product.name} solo tiene ${inventory.available} unidades disponibles ahora. El resto se considera bajo pedido.`,
        };
      } else {
        quantity = inventory.available;
        reservedQuantity = inventory.available;
        fulfillment = OrderItemFulfillment.ADJUSTED;
        message = `Ajustamos la cantidad a ${inventory.available} unidades por inventario real.`;
        issue = {
          code: 'quantity_adjusted',
          severity: OrderIssueSeverity.WARNING,
          productId: product.id,
          productName: product.name,
          title: 'Cantidad ajustada',
          description: `${product.name} solo tiene ${inventory.available} unidades disponibles. Ajustamos la bolsa automaticamente.`,
        };
      }
    } else {
      reservedQuantity = requestedQuantity;
    }

    return {
      item: {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        image: product.image,
        category: product.category,
        presentation: product.presentation,
        origin: product.origin,
        unitPrice: product.price,
        currency: product.currency,
        requestedQuantity,
        quantity,
        subtotal: quantity * product.price,
        fulfillment,
        stockAvailable: inventory.tracked ? inventory.available : null,
        reservedQuantity,
        backorderQuantity,
        inventoryTracked: inventory.tracked,
        allowBackorder: inventory.allowBackorder,
        message,
      },
      issue,
    };
  }

  private readAvailability(product: ProductDocument): InventoryAvailability {
    const tracked = typeof product.stockAvailable === 'number';
    return {
      tracked,
      available: tracked ? Math.max(product.stockAvailable ?? 0, 0) : 0,
      allowBackorder: Boolean(product.allowBackorder),
    };
  }

  private buildPreviewSignature(preview: OrderPreviewComputation): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          items: preview.items,
          issues: preview.issues,
          subtotal: preview.subtotal,
          totalItems: preview.totalItems,
          currency: preview.currency,
          needsManualReview: preview.needsManualReview,
        }),
      )
      .digest('hex');
  }

  private buildDraftReference(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `BOR-${stamp}-${random}`;
  }

  private buildConfirmedReference(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PED-${stamp}-${random}`;
  }

  private async resolveOrderingUser(
    authorization?: string,
  ): Promise<OrderActorSnapshot | null> {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
      };
    } catch {
      return null;
    }
  }

  private buildStatusNote(
    status: OrderStatus,
    note: string,
    actor?: OrderActorSnapshot,
  ) {
    return {
      status,
      note,
      actorId: actor?.userId,
      actorEmail: actor?.email,
      createdAt: new Date(),
    };
  }

  private buildAdminOrderFilters(
    query: ListAdminOrdersQueryDto,
  ): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    if (query.status) {
      filters.status = query.status;
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filters.$or = [
        { reference: regex },
        { 'customer.name': regex },
        { 'customer.email': regex },
        { 'customer.phone': regex },
      ];
    }

    return filters;
  }

  private async findOrderOrThrow(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order id');
    }

    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private assertOrderTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [OrderStatus.CANCELLED],
      [OrderStatus.PENDING_REVIEW]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.CANCELLED,
        OrderStatus.COMPLETED,
      ],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.COMPLETED]: [],
    };

    if (!transitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `No puedes cambiar un pedido en estado ${currentStatus} a ${nextStatus}.`,
      );
    }
  }

  private mapAdminOrderListItem(
    order: OrderDocument,
  ): AdminOrderListItemResponse {
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerPhone: order.customer.phone,
      totalItems: order.totalItems,
      subtotal: order.subtotal,
      currency: order.currency,
      needsManualReview: order.needsManualReview,
      createdAt: order.createdAt?.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
      completedAt: order.completedAt?.toISOString(),
    };
  }

  private mapAdminOrderDetail(
    order: OrderDocument,
  ): AdminOrderDetailResponse {
    return {
      ...this.mapAdminOrderListItem(order),
      channel: order.channel,
      customerNotes: order.customer.notes,
      customerUserId: order.customerUserId,
      customerUserEmail: order.customerUserEmail,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        image: item.image,
        category: item.category,
        presentation: item.presentation,
        origin: item.origin,
        unitPrice: item.unitPrice,
        currency: item.currency,
        requestedQuantity: item.requestedQuantity,
        quantity: item.quantity,
        subtotal: item.subtotal,
        fulfillment: item.fulfillment,
        stockAvailable: item.stockAvailable,
        reservedQuantity: item.reservedQuantity,
        backorderQuantity: item.backorderQuantity,
        inventoryTracked: item.inventoryTracked,
        allowBackorder: item.allowBackorder,
        message: item.message,
      })),
      issues: order.issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        productId: issue.productId,
        productName: issue.productName,
        title: issue.title,
        description: issue.description,
      })),
      statusNotes: (order.statusNotes ?? []).map((note) => ({
        status: note.status,
        note: note.note,
        actorId: note.actorId,
        actorEmail: note.actorEmail,
        createdAt: note.createdAt.toISOString(),
      })),
      lastValidatedAt: order.lastValidatedAt?.toISOString(),
    };
  }

  private async reserveInventoryForItem(
    item: OrderPreviewItem,
    orderReference: string,
    actor: OrderActorSnapshot,
  ): Promise<void> {
    const updatedProduct = await this.productModel
      .findOneAndUpdate(
        {
          _id: item.productId,
          status: ProductStatus.ACTIVE,
          stockAvailable: { $gte: item.reservedQuantity },
        },
        [
          {
            $set: {
              stockAvailable: {
                $subtract: [{ $ifNull: ['$stockAvailable', 0] }, item.reservedQuantity],
              },
              stockReserved: {
                $add: [{ $ifNull: ['$stockReserved', 0] }, item.reservedQuantity],
              },
              inStock: {
                $gt: [
                  {
                    $subtract: [
                      { $ifNull: ['$stockAvailable', 0] },
                      item.reservedQuantity,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        ],
        {
          returnDocument: 'after',
          updatePipeline: true,
        },
      )
      .select('stockAvailable stockReserved')
      .exec();

    if (!updatedProduct) {
      throw new ConflictException(
        `El inventario de ${item.productName} cambio mientras confirmabas tu pedido. Actualizamos la bolsa para que revises la disponibilidad actual.`,
      );
    }

    const nextAvailable = updatedProduct.stockAvailable ?? 0;
    const nextReserved = updatedProduct.stockReserved ?? 0;

    await this.inventoryMovementModel.create({
      productId: new Types.ObjectId(item.productId),
      productName: item.productName,
      type: InventoryMovementType.RESERVE,
      quantity: item.reservedQuantity,
      previousAvailable: nextAvailable + item.reservedQuantity,
      nextAvailable,
      previousReserved: Math.max(0, nextReserved - item.reservedQuantity),
      nextReserved,
      note: `Reserva automatica por el pedido ${orderReference}.`,
      orderReference,
      actorId: actor.userId,
      actorEmail: actor.email,
    });
  }

  private async rollbackReservedInventory(
    reservedMutations: AppliedInventoryMutation[],
    orderReference: string,
    actor: OrderActorSnapshot,
  ): Promise<void> {
    for (const item of [...reservedMutations].reverse()) {
      try {
        await this.releaseInventoryQuantity(item.productId, item.productName, item.quantity, {
          type: InventoryMovementType.RELEASE,
          orderReference,
          note: `Rollback de reserva por fallo al confirmar el pedido ${orderReference}.`,
          actor,
        });
      } catch {
        // Best effort rollback to avoid masking original error.
      }
    }
  }

  private async reReserveReleasedInventory(
    releasedMutations: AppliedInventoryMutation[],
    orderReference: string,
    actor: JwtPayload,
  ): Promise<void> {
    for (const item of [...releasedMutations].reverse()) {
      try {
        await this.reAddReservation(item.productId, item.productName, item.quantity, {
          orderReference,
          note: `Rollback de liberacion para conservar la reserva del pedido ${orderReference}.`,
          actor,
        });
      } catch {
        // Best effort rollback to avoid masking original error.
      }
    }
  }

  private async restoreCommittedInventory(
    committedMutations: AppliedInventoryMutation[],
    orderReference: string,
    actor: JwtPayload,
  ): Promise<void> {
    for (const item of [...committedMutations].reverse()) {
      try {
        await this.reAddReservation(item.productId, item.productName, item.quantity, {
          orderReference,
          note: `Rollback de cierre para restaurar la reserva del pedido ${orderReference}.`,
          actor,
        });
      } catch {
        // Best effort rollback to avoid masking original error.
      }
    }
  }

  private async releaseInventoryQuantity(
    productId: string,
    productName: string,
    quantity: number,
    options: {
      type: InventoryMovementType;
      orderId?: string;
      orderReference: string;
      note: string;
      actor: OrderActorSnapshot;
    },
  ): Promise<void> {
    const updatedProduct = await this.productModel
      .findOneAndUpdate(
        {
          _id: productId,
          stockReserved: { $gte: quantity },
        },
        [
          {
            $set: {
              stockAvailable: {
                $add: [{ $ifNull: ['$stockAvailable', 0] }, quantity],
              },
              stockReserved: {
                $subtract: [{ $ifNull: ['$stockReserved', 0] }, quantity],
              },
              inStock: {
                $gt: [
                  {
                    $add: [{ $ifNull: ['$stockAvailable', 0] }, quantity],
                  },
                  0,
                ],
              },
            },
          },
        ],
        {
          returnDocument: 'after',
          updatePipeline: true,
        },
      )
      .select('stockAvailable stockReserved')
      .exec();

    if (!updatedProduct) {
      throw new ConflictException(
        `No se pudo liberar la reserva de ${productName} porque el inventario ya no coincide con el pedido.`,
      );
    }

    const nextAvailable = updatedProduct.stockAvailable ?? 0;
    const nextReserved = updatedProduct.stockReserved ?? 0;

    await this.inventoryMovementModel.create({
      productId: new Types.ObjectId(productId),
      productName,
      type: options.type,
      quantity,
      previousAvailable: Math.max(0, nextAvailable - quantity),
      nextAvailable,
      previousReserved: nextReserved + quantity,
      nextReserved,
      note: options.note,
      orderId: options.orderId,
      orderReference: options.orderReference,
      actorId: options.actor.userId,
      actorEmail: options.actor.email,
    });
  }

  private async commitReservedInventory(
    productId: string,
    productName: string,
    quantity: number,
    options: {
      orderId?: string;
      orderReference: string;
      actor: OrderActorSnapshot;
    },
  ): Promise<void> {
    const updatedProduct = await this.productModel
      .findOneAndUpdate(
        {
          _id: productId,
          stockReserved: { $gte: quantity },
        },
        [
          {
            $set: {
              stockReserved: {
                $subtract: [{ $ifNull: ['$stockReserved', 0] }, quantity],
              },
              inStock: {
                $gt: [{ $ifNull: ['$stockAvailable', 0] }, 0],
              },
            },
          },
        ],
        {
          returnDocument: 'after',
          updatePipeline: true,
        },
      )
      .select('stockAvailable stockReserved')
      .exec();

    if (!updatedProduct) {
      throw new ConflictException(
        `No se pudo cerrar la reserva de ${productName} porque el inventario reservado ya no coincide con el pedido.`,
      );
    }

    const nextAvailable = updatedProduct.stockAvailable ?? 0;
    const nextReserved = updatedProduct.stockReserved ?? 0;

    await this.inventoryMovementModel.create({
      productId: new Types.ObjectId(productId),
      productName,
      type: InventoryMovementType.COMMIT_RESERVED,
      quantity,
      previousAvailable: nextAvailable,
      nextAvailable,
      previousReserved: nextReserved + quantity,
      nextReserved,
      note: `Consumo definitivo de reserva por cierre del pedido ${options.orderReference}.`,
      orderId: options.orderId,
      orderReference: options.orderReference,
      actorId: options.actor.userId,
      actorEmail: options.actor.email,
    });
  }

  private async reAddReservation(
    productId: string,
    productName: string,
    quantity: number,
    options: {
      orderReference: string;
      note: string;
      actor: OrderActorSnapshot;
    },
  ): Promise<void> {
    const updatedProduct = await this.productModel
      .findOneAndUpdate(
        { _id: productId, stockAvailable: { $gte: quantity } },
        [
          {
            $set: {
              stockAvailable: {
                $subtract: [{ $ifNull: ['$stockAvailable', 0] }, quantity],
              },
              stockReserved: {
                $add: [{ $ifNull: ['$stockReserved', 0] }, quantity],
              },
              inStock: {
                $gt: [
                  {
                    $subtract: [
                      { $ifNull: ['$stockAvailable', 0] },
                      quantity,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        ],
        {
          returnDocument: 'after',
          updatePipeline: true,
        },
      )
      .select('stockAvailable stockReserved')
      .exec();

    if (!updatedProduct) {
      throw new ConflictException(
        `No se pudo restaurar la reserva de ${productName} despues de un rollback.`,
      );
    }

    const nextAvailable = updatedProduct.stockAvailable ?? 0;
    const nextReserved = updatedProduct.stockReserved ?? 0;

    await this.inventoryMovementModel.create({
      productId: new Types.ObjectId(productId),
      productName,
      type: InventoryMovementType.RESERVE,
      quantity,
      previousAvailable: nextAvailable + quantity,
      nextAvailable,
      previousReserved: Math.max(0, nextReserved - quantity),
      nextReserved,
      note: options.note,
      orderReference: options.orderReference,
      actorId: options.actor.userId,
      actorEmail: options.actor.email,
    });
  }
}
