import { supabase } from '../lib/supabase';
import { Order } from '../types';

export const orderService = {
  async getOrders(options: { 
    userId?: string; 
    role: 'user' | 'ob'; 
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('orders')
      .select('*, profiles(name)', { count: 'exact' });

    if (options.role === 'user' && options.userId) {
      query = query.eq('user_id', options.userId);
      // Filter history to last 7 days (1 week)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gt('created_at', oneWeekAgo);
    } else if (options.role === 'ob') {
      if (options.status) {
        query = query.eq('order_status', options.status);
      } else {
        query = query.eq('order_status', 'waiting');
      }
      
      // Proactive cleanup of active orders only (not history)
      if (options.status !== 'done') {
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        query = query.gt('created_at', fourHoursAgo);
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

  async createOrder(orderData: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) throw error;
    return data as Order;
  },

  async updateOrderStatus(orderId: string, status: string, obId?: string) {
    const updateData: any = { order_status: status };
    if (obId) {
      updateData.assigned_to_ob = obId;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw error;
  },

  async updatePaymentStatus(orderId: string, status: string) {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status })
      .eq('id', orderId);

    if (error) throw error;
  }
};
