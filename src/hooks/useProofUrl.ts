import { useQuery } from '@tanstack/react-query'
import { paymentProofService } from '../api/paymentProofs'

export function useProofUrl(reference?: string | null) {
  return useQuery({
    queryKey: ['proof-url', reference],
    queryFn: () => paymentProofService.getSignedUrl(reference!),
    enabled: !!reference,
    staleTime: 240000,
    refetchInterval: 240000,
  })
}
