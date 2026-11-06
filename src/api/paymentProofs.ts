import { supabase } from '../lib/supabase'

export function proofPath(reference: string): string {
  const marker = '/payment-proofs/'
  const raw = reference.includes(marker) ? reference.split(marker)[1].split('?')[0] : reference
  const path = decodeURIComponent(raw)
  if (!path || path.startsWith('/') || path.split('/').some(part => part === '..' || part === '.')) throw new Error('Referensi bukti tidak valid.')
  return path
}
export const paymentProofService = {
  upload: (path: string, file: File) => supabase.storage.from('payment-proofs').upload(path, file),
  async getSignedUrl(reference: string) {
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(proofPath(reference), 300)
    if (error) throw error
    return data.signedUrl
  },
}
