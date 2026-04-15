import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { OrderStatus } from './enums/order-status.enum';
import { OrderItemFulfillment } from './schemas/order.schema';
import { UserRole } from '../users/enums/user-role.enum';

function execResult<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function buildOrder(status: OrderStatus) {
  return {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
    reference: 'PED-20260411-TEST01',
    status,
    currency: 'MXN',
    totalItems: 3,
    subtotal: 180,
    needsManualReview: status !== OrderStatus.CONFIRMED,
    channel: 'web_public',
    lastValidatedAt: new Date('2026-04-11T07:00:00.000Z'),
    customer: {
      name: 'Cliente Demo',
      email: 'cliente@demo.mx',
      phone: '5555555555',
    },
    items: [
      {
        productId: '507f1f77bcf86cd799439012',
        productName: 'Toronjil',
        productSlug: 'toronjil',
        image: '/toronjil.jpg',
        category: 'linea-insomnio',
        presentation: '10ml',
        origin: '100% natural',
        unitPrice: 60,
        currency: 'MXN',
        requestedQuantity: 3,
        quantity: 3,
        subtotal: 180,
        fulfillment: OrderItemFulfillment.BACKORDER,
        stockAvailable: 1,
        reservedQuantity: status === OrderStatus.DRAFT ? 3 : 1,
        backorderQuantity: status === OrderStatus.DRAFT ? 0 : 2,
        inventoryTracked: status === OrderStatus.DRAFT,
        allowBackorder: true,
      },
    ],
    issues: [],
    statusNotes: [],
    createdAt: new Date('2026-04-11T06:50:00.000Z'),
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let productModel: any;
  let inventoryMovementModel: any;
  let orderModel: any;

  beforeEach(() => {
    productModel = {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    inventoryMovementModel = {
      create: jest.fn(),
      updateMany: jest.fn().mockReturnValue(execResult({ acknowledged: true })),
    };

    orderModel = {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    service = new OrdersService(
      productModel,
      inventoryMovementModel,
      orderModel,
      { findById: jest.fn(), markActivity: jest.fn() } as any,
      {} as JwtService,
      { recordCompletedOrder: jest.fn() } as any,
    );
  });

  it('cancela un borrador sin liberar inventario reservado de otros pedidos', async () => {
    const draftOrder = buildOrder(OrderStatus.DRAFT);
    const cancelledOrder = {
      ...draftOrder,
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date('2026-04-11T07:10:00.000Z'),
    };

    orderModel.findById.mockReturnValue(execResult(draftOrder));
    orderModel.findOneAndUpdate.mockReturnValue(execResult(cancelledOrder));

    const releaseSpy = jest.spyOn(
      service as unknown as {
        releaseInventoryQuantity: (...args: unknown[]) => Promise<void>;
      },
      'releaseInventoryQuantity',
    );

    await service.updateOrderStatus(
      draftOrder.id,
      { status: OrderStatus.CANCELLED },
      {
        sub: 'admin-1',
        email: 'admin@inhalex.mx',
        role: UserRole.ADMIN,
      },
    );

    expect(releaseSpy).not.toHaveBeenCalled();
  });

  it('guarda el actor correcto en las notas cuando confirma un pedido', async () => {
    const order = buildOrder(OrderStatus.PENDING_REVIEW);
    const updatedOrder = {
      ...order,
      status: OrderStatus.CONFIRMED,
      confirmedAt: new Date('2026-04-11T07:12:00.000Z'),
      statusNotes: [],
    };

    orderModel.findById.mockReturnValue(execResult(order));
    orderModel.findOneAndUpdate.mockReturnValue(execResult(updatedOrder));

    await service.updateOrderStatus(
      order.id,
      { status: OrderStatus.CONFIRMED },
      {
        sub: 'admin-2',
        email: 'operaciones@inhalex.mx',
        role: UserRole.ADMIN,
      },
    );

    const updatePayload = orderModel.findOneAndUpdate.mock.calls[0][1];
    expect(updatePayload.$push.statusNotes.actorId).toBe('admin-2');
    expect(updatePayload.$push.statusNotes.actorEmail).toBe(
      'operaciones@inhalex.mx',
    );
  });

  it('impide completar un pedido si aun faltan piezas por surtir', async () => {
    const order = buildOrder(OrderStatus.CONFIRMED);

    orderModel.findById.mockReturnValue(execResult(order));
    productModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue(
        execResult({
          id: order.items[0].productId,
          name: 'Toronjil',
          status: 'active',
          stockAvailable: 1,
          allowBackorder: true,
          inStock: true,
        }),
      ),
    });

    await expect(
      service.updateOrderStatus(
        order.id,
        { status: OrderStatus.COMPLETED },
        {
          sub: 'admin-3',
          email: 'ventas@inhalex.mx',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
