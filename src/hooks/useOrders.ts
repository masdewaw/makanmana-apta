import type { OrderStatus, PaymentStatus } from '../types';
import { useTableSync } from './useTableSync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../api/orders';
import { toast } from 'sonner';

interface UseOrdersOptions {
  userId?: string;
  role: 'user' | 'ob';
  status?: OrderStatus;
  paymentOb?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

export function useOrders(options: UseOrdersOptions) {
  const queryClient = useQueryClient();
  useTableSync('orders', 'orders');

// Fetch orders
  const { data: ordersData, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', options.role, options.userId, options.status, options.limit, options.offset, options.paymentOb],
    queryFn: () => orderService.getOrders(options),
    enabled: options.enabled ?? true,
    refetchInterval: 30000, // Fallback if Realtime is unavailable
  });

  const orders = ordersData?.data || [];
  const totalCount = ordersData?.count || 0;

  // Split into active and history
  const activeOrders = options.status === 'done' ? [] : orders.filter(o => o.order_status !== 'done');
  const historyOrders = options.status === 'done' ? orders : orders.filter(o => o.order_status === 'done');

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
    mutationFn: ({ orderId, status, obId }: { orderId: string, status: OrderStatus, obId?: string }) =>
      orderService.updateOrderStatus(orderId, status, obId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string, status: PaymentStatus }) =>
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
    orders,
    totalCount,
    activeOrders,
    historyOrders,
    isLoading,
    error,
    refetch,
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
