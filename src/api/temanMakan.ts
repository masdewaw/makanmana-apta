import { supabase } from '@/lib/supabase';
import { TemanMakanGroup, TemanMakanOrder } from '@/types';

export const temanMakanService = {
  async getRooms() {
    const { data, error } = await supabase
      .from('teman_makan_groups')
      .select('*, profiles(name)')
      .in('status', ['open', 'finished'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TemanMakanGroup[];
  },

  async getRoomOrders(groupId: string) {
    const { data, error } = await supabase
      .from('teman_makan_orders')
      .select('*, profiles(name)')
      .eq('group_id', groupId);

    if (error) throw error;
    return data as TemanMakanOrder[];
  },

  async createRoom(params: {
    creatorId: string;
    title: string;
    bankInfo?: string;
    deadline?: string;
  }) {
    const { data, error } = await supabase
      .from('teman_makan_groups')
      .insert([{
        creator_id: params.creatorId,
        title: params.title,
        bank_info: params.bankInfo || null,
        deadline: params.deadline || null,
        status: 'open'
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TemanMakanGroup;
  },

  async joinRoom(params: {
    groupId: string;
    userId: string;
    menuName: string;
    price: number;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('teman_makan_orders')
      .insert([{
        group_id: params.groupId,
        user_id: params.userId,
        menu_name: params.menuName,
        price: params.price,
        notes: params.notes || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TemanMakanOrder;
  },

  async deleteOrder(orderId: string) {
    const { error } = await supabase
      .from('teman_makan_orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
  },

  async finishRoom(groupId: string) {
    const { error } = await supabase
      .from('teman_makan_groups')
      .update({ status: 'finished' })
      .eq('id', groupId);

    if (error) throw error;
  }
};
