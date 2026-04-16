import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../api/orders';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UseOrdersOptions {
  userId?: string;
  role: 'user' | 'ob';
  status?: string;
  limit?: number;
  offset?: number;
}

export function useOrders(options: UseOrdersOptions) {
  const queryClient = useQueryClient();

// Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', options.role, options.userId, options.status, options.limit, options.offset],
    queryFn: () => orderService.getOrders(options),
    refetchInterval: 5000, // Faster poll for OB
  });

  const orders = ordersData?.data || [];
  const totalCount = ordersData?.count || 0;

  // Split into active and history
  const activeOrders = options.status === 'done' ? [] : orders.filter(o => o.order_status !== 'done');
  const historyOrders = options.status === 'done' ? orders : orders.filter(o => o.order_status === 'done');

  // Real-time synchronization
  useEffect(() => {
    const channelName = `orders_${Math.random().toString(36).slice(2, 11)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.role, options.userId, queryClient]);

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, obId }: { orderId: string, status: string, obId?: string }) =>
      orderService.updateOrderStatus(orderId, status, obId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string, status: string }) =>
      orderService.updatePaymentStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Convenience wrappers for OB
  const takeOrder = (orderId: string, obId: string) => updateStatusMutation.mutate({ orderId, status: 'waiting', obId });
  const releaseOrder = (orderId: string) => updateStatusMutation.mutate({ orderId, status: 'waiting', obId: '' }); // Clearing obId
  const completeOrder = (orderId: string) => updateStatusMutation.mutate({ orderId, status: 'done' });
  const verifyPayment = (orderId: string) => updatePaymentMutation.mutate({ orderId, status: 'paid' });

  return {
    totalCount,
    activeOrders,
    historyOrders,
    isLoading,
    createOrder: createOrderMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    updatePayment: updatePaymentMutation.mutate,
    takeOrder,
    releaseOrder,
    completeOrder,
    verifyPayment
  };
}
