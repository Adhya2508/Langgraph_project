// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { checkHealth } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { usePipeline } from './usePipeline';

export const useDashboard = () => {
  const { history, clean, features, isAnyPending } = usePipeline();

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: checkHealth,
    refetchInterval: 15000,
    retry: 2,
  });

  const getLatestFile = () => {
    const uploadEntry = history.find(h => h.artifacts && h.artifacts.length > 0);
    if (uploadEntry && uploadEntry.artifacts) {
      return uploadEntry.artifacts[0].split('/').pop() || 'bank_churn_dataset.csv';
    }
    return null;
  };

  return {
    health: healthQuery.data,
    healthLoading: healthQuery.isLoading,
    healthError: healthQuery.error,
    latestFilename: getLatestFile(),
    history,
    clean,
    features,
    isAnyPending,
  };
};

export default useDashboard;
