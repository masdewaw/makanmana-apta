import { useTableSync } from './useTableSync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { splitBillService } from '@/api/splitBill';
import { toast } from 'sonner';

export const useSplitBill = (billId?: string) => {
  const queryClient = useQueryClient();
  useTableSync('split_bills', 'splitBills');
  useTableSync('split_bill_items', 'splitBillItems');

  // 1. Fetch all split bills
  const billsQuery = useQuery({
    queryKey: ['splitBills'],
    queryFn: () => splitBillService.getBills(),
    refetchInterval: 30000,
  });

  // 2. Fetch items for a specific bill
  const billItemsQuery = useQuery({
    queryKey: ['splitBillItems', billId],
    queryFn: () => (billId ? splitBillService.getBillItems(billId) : Promise.resolve([])),
    refetchInterval: 30000,
    enabled: !!billId,
  });

  const createBillWithItems = useMutation({
    mutationFn: splitBillService.createBillWithItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitBills'] });
      queryClient.invalidateQueries({ queryKey: ['splitBillItems'] });
    },
  });

  // Mutation: Create Bill
  const createBill = useMutation({
    mutationFn: splitBillService.createBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitBills'] });
      toast.success("Room Patungan Dibuat! 💸");
    },
    onError: (error: any) => toast.error("Gagal buat patungan: " + error.message),
  });

  // Mutation: Save Items
  const saveItems = useMutation({
    mutationFn: (params: { billId: string, items: Parameters<typeof splitBillService.saveItems>[1] }) =>
      splitBillService.saveItems(params.billId, params.items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['splitBillItems', variables.billId] });
      toast.success("Item berhasil disimpan!");
    },
    onError: (error: any) => toast.error("Gagal simpan item: " + error.message),
  });

  // Mutation: Update Assignment
  const updateAssignment = useMutation({
    mutationFn: (params: { itemId: string, userId: string | null }) => 
      splitBillService.updateItemAssignment(params.itemId, params.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitBillItems', billId] });
      toast.success("Berhasil klaim item!");
    },
    onError: (error: any) => toast.error("Gagal klaim: " + error.message),
  });

  // Mutation: Finish Bill
  const finishBill = useMutation({
    mutationFn: splitBillService.finishBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitBills'] });
      if (billId) queryClient.invalidateQueries({ queryKey: ['splitBillItems', billId] });
      toast.success("Patungan ditutup!");
    },
    onError: (error: any) => toast.error("Gagal tutup patungan: " + error.message),
  });

  return {
    error: billsQuery.error || billItemsQuery.error,
    refetch: () => Promise.all([billsQuery.refetch(), ...(billId ? [billItemsQuery.refetch()] : [])]),
    bills: billsQuery.data || [],
    isLoadingBills: billsQuery.isLoading,
    items: billItemsQuery.data || [],
    isLoadingItems: billItemsQuery.isLoading,
    createBillWithItems: createBillWithItems.mutateAsync,
    isSavingBill: createBillWithItems.isPending,
    createBill: createBill.mutate,
    isCreatingBill: createBill.isPending,
    saveItems: saveItems.mutate,
    updateAssignment: updateAssignment.mutate,
    finishBill: finishBill.mutate,
  };
};
