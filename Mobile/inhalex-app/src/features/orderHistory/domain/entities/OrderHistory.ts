export type OrderHistoryStatus = 'pending_review' | 'confirmed' | 'cancelled' | 'completed';

export interface OrderHistoryEntry {
  id: string;
  reference: string;
  status: OrderHistoryStatus;
  currency: string;
  totalItems: number;
  subtotal: number;
  createdAt: string;
}

export interface OrderHistoryPage {
  orders: OrderHistoryEntry[];
  nextCursor: string | null;
}

export interface OrderHistoryItem {
  productId: string;
  productName: string;
  presentation: string;
  image: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  currency: string;
}

/** The address captured at purchase time, independent of the current address book. */
export interface OrderHistoryAddress {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  municipality: string;
  state: string;
  postalCode: string;
  references?: string;
}

export interface OrderHistoryDetail extends OrderHistoryEntry {
  items: OrderHistoryItem[];
  shippingAddress: OrderHistoryAddress | null;
}
