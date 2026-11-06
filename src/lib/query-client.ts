import { assertOnline } from './connectivity';
import { MutationCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onMutate: () => { assertOnline(); } }),
  defaultOptions: {
    mutations: { networkMode: 'always', retry: false },
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
