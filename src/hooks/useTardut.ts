import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tardutService } from '../api/tardut';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function useTardut(options?: { userId?: string, limit?: number, offset?: number, status?: string }) {
  const queryClient = useQueryClient();

  // Fetch requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['tardut-requests', options?.userId, options?.status, options?.limit, options?.offset],
    queryFn: () => tardutService.getRequests(options),
    refetchInterval: 10000, // Poll every 10s for updates
  });

  const requests = requestsData?.data || [];
  const totalCount = requestsData?.count || 0;

  // Real-time synchronization
  useEffect(() => {
    const channelName = `tardut_${Math.random().toString(36).slice(2, 11)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tardut_requests'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tardut-requests'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Submit request
  const submitMutation = useMutation({
    mutationFn: ({ amount, proofFile }: { amount: number, proofFile: File }) => 
      tardutService.submitRequest(options?.userId!, amount, proofFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tardut-requests'] });
      toast.success("Permintaan Tardut terkirim! Silakan tunggu OB.");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Update status (for OB Dashboard)
  const updateStatusMutation = useMutation({
    mutationFn: ({ requestId, status, obId }: { requestId: string, status: string, obId?: string }) =>
      tardutService.updateStatus(requestId, status, obId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tardut-requests'] });
      toast.success("Status Tardut diperbarui.");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  return {
    requests,
    totalCount,
    isLoading,
    submitTardut: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    updateTardutStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending
  };
}
