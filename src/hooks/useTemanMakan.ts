import { useTableSync } from './useTableSync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { temanMakanService } from '@/api/temanMakan';
import { toast } from 'sonner';

export const useTemanMakan = (groupId?: string) => {
  const queryClient = useQueryClient();
  useTableSync('teman_makan_groups', 'tmRooms');
  useTableSync('teman_makan_orders', 'tmOrders');

  // 1. Fetch all rooms
  const roomsQuery = useQuery({
    queryKey: ['tmRooms'],
    queryFn: () => temanMakanService.getRooms(),
    refetchInterval: 30000,
  });

  // 2. Fetch orders for a specific room (if groupId is provided)
  const roomOrdersQuery = useQuery({
    queryKey: ['tmOrders', groupId],
    queryFn: () => (groupId ? temanMakanService.getRoomOrders(groupId) : Promise.resolve([])),
    refetchInterval: 30000,
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

  return {
    error: roomsQuery.error || roomOrdersQuery.error,
    refetch: () => Promise.all([roomsQuery.refetch(), ...(groupId ? [roomOrdersQuery.refetch()] : [])]),
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
