export interface Profile {
  id: string;
  name: string;
  role?: 'user' | 'OB';
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
  payment_method: string;
  payment_status: string;
  order_status: string;
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
  status: string;
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
  status: 'open' | 'finished';
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
  status: 'open' | 'finished';
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
