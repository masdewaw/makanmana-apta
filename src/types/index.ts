// Status values verified against production CHECK constraints on 2026-11-06.
export type OrderStatus = 'waiting' | 'done';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMethod = 'cash' | 'transfer';
export type TardutStatus = 'waiting' | 'done' | 'cancelled';
export type RoomStatus = 'open' | 'finished';

export interface Profile {
  id: string;
  name: string;
  role?: 'user' | 'OB';
  ob_code?: 'OB 1' | 'OB 2' | null;
  last_lat?: number;
  last_lng?: number;
  last_updated_at?: string;
}

export interface Menu {
  id: string;
  food_name: string;
  price: number;
  category: string;
  created_at?: string;
}

export interface Order {
  id: string;
  user_id: string;
  profiles?: { name: string };
  food_name: string;
  price: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  proof_url: string | null;
  assigned_to_ob?: string;
  transfer_to?: string | null;
  catatan: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface TardutRequest {
  id: string;
  user_id: string;
  profiles?: { name: string };
  amount: number;
  proof_url: string;
  status: TardutStatus;
  assigned_to_ob?: string;
  created_at: string;
}

export interface TemanMakanGroup {
  id: string;
  creator_id: string;
  profiles?: { name: string };
  title: string;
  description?: string | null;
  bank_info: string | null;
  status: RoomStatus;
  deadline: string | null;
  created_at: string;
}

export interface TemanMakanOrder {
  id: string;
  group_id: string;
  user_id: string;
  profiles?: { name: string };
  menu_name: string;
  price: number;
  notes?: string | null;
  created_at: string;
}

export interface SplitBill {
  id: string;
  creator_id: string;
  profiles?: { name: string };
  title: string;
  merchant_name?: string | null;
  total_final?: number;
  discount?: number;
  fees?: number;
  delivery_fee?: number;
  bank_info: string | null;
  status: RoomStatus;
  created_at: string;
}

export interface SplitBillItem {
  id: string;
  split_bill_id: string;
  user_id: string | null;
  profiles?: { name: string };
  item_name: string;
  price: number;
  item_type: 'food' | 'shared';
}

export interface Category {
  id: string;
  name: string;
}
