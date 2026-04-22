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
    // 1. Run lazy cleanup of old orders (older than 8 hours) first
    await this.cleanupOldOrders();

    let query = supabase
      .from('orders')
      .select('*, profiles(name)', { count: 'exact' });

    if (options.role === 'user' && options.userId) {
      query = query.eq('user_id', options.userId);
    } else if (options.role === 'ob') {
      if (options.status) {
        query = query.eq('order_status', options.status);
      } else {
        query = query.eq('order_status', 'waiting');
      }
      
      // Proactive cleanup of active orders only (not history)
      if (options.status !== 'done') {
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

  async cleanupOldOrders() {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    
    // Select orders that are:
    // 1. Not 'done'
    // 2. Older than 8 hours
    const { error } = await supabase
      .from('orders')
      .update({ order_status: 'done' })
      .neq('order_status', 'done')
      .lt('created_at', eightHoursAgo);

    if (error) console.error('Error during lazy auto-completion:', error);
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
    if (obId !== undefined) {
      updateData.assigned_to_ob = obId || null;
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
