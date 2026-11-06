import type { TardutStatus } from '../types';
import { useTableSync } from './useTableSync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tardutService } from '../api/tardut';
import { toast } from 'sonner';

export function useTardut(options?: { userId?: string, limit?: number, offset?: number, status?: TardutStatus }) {
  const queryClient = useQueryClient();
  useTableSync('tardut_requests', 'tardut-requests');

  // Fetch requests
  const { data: requestsData, isLoading, error, refetch } = useQuery({
    queryKey: ['tardut-requests', options?.userId, options?.status, options?.limit, options?.offset],
    queryFn: () => tardutService.getRequests(options),
    refetchInterval: 30000, // Fallback if Realtime is unavailable
  });

  const requests = requestsData?.data || [];
  const totalCount = requestsData?.count || 0;

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
    mutationFn: ({ requestId, status, obId }: { requestId: string, status: TardutStatus, obId?: string }) =>
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
    error,
    refetch,
    submitTardut: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    updateTardutStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending
  };
}
