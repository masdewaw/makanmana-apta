import { paymentProofService } from './paymentProofs';
import { supabase } from '../lib/supabase';
import { TardutRequest, TardutStatus } from '../types';

export const tardutService = {
  async submitRequest(userId: string, amount: number, proofFile: File) {
    // 1. Upload proof
    const fileExt = proofFile.name.split('.').pop();
    const fileName = `tardut-${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await paymentProofService.upload(filePath, proofFile);

    if (uploadError) throw uploadError;

    const publicUrl = filePath;

    // 2. Insert request
    const { error: insertError } = await supabase
      .from('tardut_requests')
      .insert({
        user_id: userId,
        amount: amount,
        proof_url: publicUrl,
        status: 'waiting'
      });

    if (insertError) throw insertError;
    
    return { publicUrl };
  },

  async getRequests(options?: { userId?: string, limit?: number, offset?: number, status?: TardutStatus }) {
    let query = supabase
      .from('tardut_requests')
      .select('*, profiles(name)', { count: 'exact' });

    if (options?.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options?.limit) {
      const start = options.offset || 0;
      query = query.range(start, start + options.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    
    return {
      data: data as TardutRequest[],
      count: count || 0
    };
  },

  async updateStatus(requestId: string, status: TardutStatus, obId?: string) {
    const updateData: { status: TardutStatus; assigned_to_ob?: string } = { status };
    if (obId) {
      updateData.assigned_to_ob = obId;
    }

    const { error } = await supabase
      .from('tardut_requests')
      .update(updateData)
      .eq('id', requestId).select('id').single();

    if (error) throw error;
  }
};
