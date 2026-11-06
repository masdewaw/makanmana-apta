import { useQuery } from '@tanstack/react-query'
import { profileService } from '../api/profiles'
import { useTableSync } from './useTableSync'

const fallbackNames: Record<string, string> = { 'OB 1': 'Bahul', 'OB 2': 'Masber' }
export function useObNames() {
  useTableSync('profiles', 'ob-profiles')
  const { data } = useQuery({
    queryKey: ['ob-profiles'],
    queryFn: async () => {
      const { data, error } = await profileService.getObNames()
      if (error) throw error
      return data as { name: string; ob_code: string | null }[]
    },
  })
  return (code?: string | null) => data?.find(profile => profile.ob_code === code)?.name || fallbackNames[code ?? ''] || 'OB'
}
