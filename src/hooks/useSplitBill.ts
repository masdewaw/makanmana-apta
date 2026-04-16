import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { splitBillService } from '@/api/splitBill';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useSplitBill = (billId?: string) => {
  const queryClient = useQueryClient();

  // 1. Fetch all split bills
  const billsQuery = useQuery({
    queryKey: ['splitBills'],
    queryFn: () => splitBillService.getBills(),
  });

  // 2. Fetch items for a specific bill
  const billItemsQuery = useQuery({
    queryKey: ['splitBillItems', billId],
    queryFn: () => (billId ? splitBillService.getBillItems(billId) : Promise.resolve([])),
    enabled: !!billId,
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
    mutationFn: (params: { billId: string, items: any[] }) => 
      splitBillService.saveItems(params.billId, params.items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['splitBillItems', billId] });
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

  // Real-time synchronization
  useEffect(() => {
    const channelName = `split_bills_${Math.random().toString(36).slice(2, 11)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_bills' }, () => {
        queryClient.invalidateQueries({ queryKey: ['splitBills'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_bill_items' }, () => {
        if (billId) queryClient.invalidateQueries({ queryKey: ['splitBillItems', billId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [billId, queryClient]);

  return {
    bills: billsQuery.data || [],
    isLoadingBills: billsQuery.isLoading,
    items: billItemsQuery.data || [],
    isLoadingItems: billItemsQuery.isLoading,
    createBill: createBill.mutate,
    isCreatingBill: createBill.isPending,
    saveItems: saveItems.mutate,
    updateAssignment: updateAssignment.mutate,
    finishBill: finishBill.mutate,
  };
};
