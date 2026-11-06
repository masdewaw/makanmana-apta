import { normalizeOrderNote } from '../lib/order-notes';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus, PaymentStatus } from '../types';

let cleanupInFlight: Promise<void> | null = null;

export const orderService = {
  getRecentFoodNames: (userId: string) => supabase.from('orders').select('food_name')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  getCommunityOrders: () => supabase.rpc('community_orders'),
  getRankingOrders: () => supabase.rpc('food_rankings'),
  async getOrders(options: { 
    userId?: string; 
    role: 'user' | 'ob'; 
    status?: OrderStatus;
    paymentOb?: string;
    limit?: number;
    offset?: number;
  }) {
    // 1. Run lazy cleanup of old orders (older than 8 hours) first
    await this.cleanupOldOrders();

    let query = supabase
      .from('orders')
      .select('*, profiles(name)', { count: 'exact' });
    if (options.paymentOb) {
      const recipient = options.paymentOb === 'OB 1' ? 'Bahul' : 'Masber';
      query = query.eq('payment_status', 'pending').or(`assigned_to_ob.eq.${options.paymentOb},and(assigned_to_ob.is.null,transfer_to.eq.${recipient})`);
    } else query = query.eq('order_status', options.status ?? 'waiting');

    if (options.role === 'user' && options.userId) {
      query = query.eq('user_id', options.userId);
    } else if (options.role === 'ob') {

      // Proactive cleanup of active orders only (not history)
      if (options.status !== 'done' && !options.paymentOb) {
        const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
        query = query.gt('created_at', eightHoursAgo);
      }
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      const start = options.offset || 0;
      query = query.range(start, start + options.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      data: data as Order[],
      count: count || 0
    };
  },

  cleanupOldOrders() {
    if (!cleanupInFlight) {
      cleanupInFlight = (async () => {
        const { error } = await supabase.rpc('complete_expired_orders');
        if (error) console.error('Error during lazy auto-completion:', error);
      })().finally(() => { cleanupInFlight = null; });
    }
    return cleanupInFlight;
  },

  async createOrder(orderData: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...orderData, catatan: normalizeOrderNote(orderData.catatan) })
      .select()
      .single();
    
    if (error) {
      // A previous attempt may have committed before its response was lost.
      // Reuse the unit ID on retry instead of creating another order.
      if (orderData.id) {
        const existing = await supabase.from('orders').select('*').eq('id', orderData.id).single();
        if (!existing.error && existing.data) return existing.data as Order;
      }
      throw error;
    }
    return data as Order;
  },

  async transitionObOrder(orderId: string, obId: string, action: 'take' | 'release' | 'done' | 'undo') {
    let query = supabase.from('orders').update({
      order_status: action === 'done' ? 'done' : 'waiting',
      assigned_to_ob: action === 'release' ? null : obId,
    }).eq('id', orderId).eq('order_status', action === 'undo' ? 'done' : 'waiting').gt('created_at', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString());
    query = action === 'take' ? query.is('assigned_to_ob', null) : query.eq('assigned_to_ob', obId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Pesanan sudah berubah. Antrean sedang diperbarui.');
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, obId?: string) {
    const updateData: { order_status: OrderStatus; assigned_to_ob?: string | null } = { order_status: status };
    if (obId !== undefined) {
      updateData.assigned_to_ob = obId || null;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId).select('id').single();

    if (error) throw error;
  },

  async updatePaymentStatus(orderId: string, status: PaymentStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status })
      .eq('id', orderId).select('id').single();

    if (error) throw error;
  }
};
