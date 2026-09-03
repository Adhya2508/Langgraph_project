// src/hooks/useBackendHealth.ts
import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';

export const useBackendHealth = () => {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: checkHealth,
    refetchInterval: 15000, // Check every 15s
    retry: 2,
    refetchOnWindowFocus: true,
  });
};
