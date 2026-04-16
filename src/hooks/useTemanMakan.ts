import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { temanMakanService } from '@/api/temanMakan';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useTemanMakan = (groupId?: string) => {
  const queryClient = useQueryClient();

  // 1. Fetch all rooms
  const roomsQuery = useQuery({
    queryKey: ['tmRooms'],
    queryFn: () => temanMakanService.getRooms(),
  });

  // 2. Fetch orders for a specific room (if groupId is provided)
  const roomOrdersQuery = useQuery({
    queryKey: ['tmOrders', groupId],
    queryFn: () => (groupId ? temanMakanService.getRoomOrders(groupId) : Promise.resolve([])),
    enabled: !!groupId,
  });

  // Mutation: Create Room
  const createRoom = useMutation({
    mutationFn: temanMakanService.createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmRooms'] });
      toast.success("Room Teman Makan Dibuat! 🎉");
    },
    onError: (error: any) => toast.error("Gagal buat room: " + error.message),
  });

  // Mutation: Join Room
  const joinRoom = useMutation({
    mutationFn: temanMakanService.joinRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmOrders', groupId] });
      toast.success("Pesanan ditambahkan ke grup!");
    },
    onError: (error: any) => toast.error("Gagal join order: " + error.message),
  });

  // Mutation: Delete Order
  const deleteOrder = useMutation({
    mutationFn: temanMakanService.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmOrders', groupId] });
      toast.success("Pesanan berhasil dihapus!");
    },
    onError: (error: any) => toast.error("Gagal menghapus pesanan: " + error.message),
  });

  // Mutation: Finish Room
  const finishRoom = useMutation({
    mutationFn: temanMakanService.finishRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmRooms'] });
      if (groupId) queryClient.invalidateQueries({ queryKey: ['tmOrders', groupId] });
      toast.success("Room ditutup & selesai!");
    },
    onError: (error: any) => toast.error("Gagal menutup room: " + error.message),
  });

  // Real-time synchronization for Rooms
  useEffect(() => {
    const channelName = `tm_groups_${Math.random().toString(36).slice(2, 11)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teman_makan_groups' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tmRooms'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Real-time synchronization for Orders within a room
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`tm_orders_${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'teman_makan_orders',
        filter: `group_id=eq.${groupId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tmOrders', groupId] });
        toast.success("Ada update pesanan di grup! 🎉");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return {
    rooms: roomsQuery.data || [],
    isLoadingRooms: roomsQuery.isLoading,
    roomOrders: roomOrdersQuery.data || [],
    isLoadingOrders: roomOrdersQuery.isLoading,
    createRoom: createRoom.mutate,
    isCreatingRoom: createRoom.isPending,
    joinRoom: joinRoom.mutate,
    isJoiningRoom: joinRoom.isPending,
    deleteOrder: deleteOrder.mutate,
    finishRoom: finishRoom.mutate,
  };
};
