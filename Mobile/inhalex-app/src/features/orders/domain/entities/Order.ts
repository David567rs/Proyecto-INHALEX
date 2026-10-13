export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface OrderContact {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export type OrderContactErrors = Partial<Record<keyof OrderContact, string>>;
export type OrderStatus = 'pending_review' | 'confirmed' | 'cancelled' | 'completed';
export type OrderItemFulfillment = 'available' | 'adjusted' | 'backorder' | 'manual';

export interface OrderPreviewItem extends OrderItemInput {
  productName: string;
  productSlug: string;
  image: string;
  imageUrl: string | null;
  category: string;
  presentation: string;
  origin: string;
  unitPrice: number;
  currency: string;
  requestedQuantity: number;
  subtotal: number;
  fulfillment: OrderItemFulfillment;
  stockAvailable?: number | null;
  reservedQuantity: number;
  backorderQuantity: number;
  inventoryTracked: boolean;
  allowBackorder: boolean;
  message?: string;
}

export interface OrderIssue {
  code: string;
  severity: 'info' | 'warning' | 'error';
  productId?: string;
  productName?: string;
  title: string;
  description: string;
}

export interface OrderPreview {
  items: OrderPreviewItem[];
  issues: OrderIssue[];
  subtotal: number;
  totalItems: number;
  currency: string;
  canCreateDraft: boolean;
  canConfirmOrder: boolean;
  needsManualReview: boolean;
  signature: string;
}

export interface ConfirmOrderInput extends OrderContact {
  items: OrderItemInput[];
  shippingAddressId: string;
  previewSignature: string;
  notes?: string;
}

export interface ConfirmedOrder extends OrderPreview {
  orderId: string;
  reference: string;
  status: OrderStatus;
  createdAt?: string;
}

export class OrderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderInputError';
  }
}

export function validateOrderContact(input: OrderContact): {
  value: OrderContact;
  errors: OrderContactErrors;
  isValid: boolean;
} {
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const value: OrderContact = {
    customerName: text(input?.customerName),
    customerEmail: text(input?.customerEmail).toLowerCase(),
    customerPhone: text(input?.customerPhone),
  };
  const errors: OrderContactErrors = {};
  if (value.customerName.length < 2 || value.customerName.length > 120) {
    errors.customerName = 'Escribe un nombre de entre 2 y 120 caracteres.';
  }
  if (value.customerEmail.length < 5 || value.customerEmail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.customerEmail)) {
    errors.customerEmail = 'Escribe un correo electrónico válido.';
  }
  if (!/^\d{10,15}$/.test(value.customerPhone)) {
    errors.customerPhone = 'Escribe un teléfono de 10 a 15 dígitos, sin espacios.';
  }
  return { value, errors, isValid: Object.keys(errors).length === 0 };
}

export function normalizeOrderItems(items: OrderItemInput[]): OrderItemInput[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw new OrderInputError('La bolsa debe contener entre 1 y 20 productos distintos.');
  }
  const ids = new Set<string>();
  return items.map((item) => {
    if (!item || typeof item.productId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(item.productId) ||
      ids.has(item.productId.toLowerCase()) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 25) {
      throw new OrderInputError('Revisa los productos y las cantidades de tu bolsa.');
    }
    ids.add(item.productId.toLowerCase());
    return { productId: item.productId.toLowerCase(), quantity: item.quantity };
  });
}

export function normalizeConfirmOrderInput(input: ConfirmOrderInput): ConfirmOrderInput {
  const contact = validateOrderContact(input);
  if (!contact.isValid) throw new OrderInputError(Object.values(contact.errors)[0]!);
  if (typeof input.shippingAddressId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(input.shippingAddressId)) {
    throw new OrderInputError('Selecciona una dirección de envío guardada.');
  }
  if (typeof input.previewSignature !== 'string' || !/^[a-f0-9]{64}$/.test(input.previewSignature)) {
    throw new OrderInputError('Actualiza el resumen antes de confirmar el pedido.');
  }
  if (input.notes !== undefined && (typeof input.notes !== 'string' || input.notes.trim().length > 600)) {
    throw new OrderInputError('Las notas deben tener como máximo 600 caracteres.');
  }
  return {
    items: normalizeOrderItems(input.items),
    ...contact.value,
    shippingAddressId: input.shippingAddressId.toLowerCase(),
    previewSignature: input.previewSignature,
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}
