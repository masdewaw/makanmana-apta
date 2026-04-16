import { supabase } from '@/lib/supabase';
import { SplitBill, SplitBillItem } from '@/types';

export const splitBillService = {
  async getBills() {
    const { data, error } = await supabase
      .from('split_bills')
      .select('*, profiles:creator_id(name)')
      .in('status', ['open', 'finished'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SplitBill[];
  },

  async getBillItems(billId: string) {
    const { data, error } = await supabase
      .from('split_bill_items')
      .select('*, profiles:user_id(name)')
      .eq('split_bill_id', billId);

    if (error) throw error;
    return data as SplitBillItem[];
  },

  async createBill(params: {
    creatorId: string;
    title: string;
    merchantName?: string;
    totalFinal?: number;
    discount?: number;
    fees?: number;
    deliveryFee?: number;
    bankInfo?: string;
  }) {
    const { data, error } = await supabase
      .from('split_bills')
      .insert([{
        creator_id: params.creatorId,
        title: params.title,
        merchant_name: params.merchantName || null,
        total_final: params.totalFinal || 0,
        discount: params.discount || 0,
        fees: params.fees || 0,
        delivery_fee: params.deliveryFee || 0,
        bank_info: params.bankInfo || null,
        status: 'open'
      }])
      .select()
      .single();

    if (error) throw error;
    return data as SplitBill;
  },

  async saveItems(billId: string, items: { itemName: string, price: number, itemType: 'food' | 'shared', userId?: string | null }[]) {
    const { error } = await supabase
      .from('split_bill_items')
      .insert(items.map(item => ({
        split_bill_id: billId,
        item_name: item.itemName,
        price: item.price,
        item_type: item.itemType,
        user_id: item.userId || null
      })));

    if (error) throw error;
  },

  async updateItemAssignment(itemId: string, userId: string | null) {
    const { error } = await supabase
      .from('split_bill_items')
      .update({ user_id: userId })
      .eq('id', itemId);

    if (error) throw error;
  },

  async finishBill(billId: string) {
    const { error } = await supabase
      .from('split_bills')
      .update({ status: 'finished' })
      .eq('id', billId);

    if (error) throw error;
  }
};
