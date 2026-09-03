// src/hooks/useEDA.ts
import { useQuery } from '@tanstack/react-query';
import { getEDA, getArtifactContent } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';

export const useEDA = () => {
  const edaQuery = useQuery({
    queryKey: queryKeys.eda,
    queryFn: getEDA,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const correlationQuery = useQuery({
    queryKey: ['eda_correlation'],
    queryFn: () => getArtifactContent('eda_correlation'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const outliersQuery = useQuery({
    queryKey: ['eda_outlier_report'],
    queryFn: () => getArtifactContent('eda_outlier_report'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const cleanedDataQuery = useQuery({
    queryKey: ['cleaned_dataset'],
    queryFn: () => getArtifactContent('cleaned_dataset'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    edaQuery,
    correlationQuery,
    outliersQuery,
    cleanedDataQuery,
    edaData: edaQuery.data,
    correlationData: correlationQuery.data,
    outliersData: outliersQuery.data,
    cleanedData: cleanedDataQuery.data,
    isLoading: edaQuery.isLoading || correlationQuery.isLoading || outliersQuery.isLoading || cleanedDataQuery.isLoading,
    isError: edaQuery.isError || correlationQuery.isError || outliersQuery.isError || cleanedDataQuery.isError,
    error: edaQuery.error || correlationQuery.error || outliersQuery.error || cleanedDataQuery.error,
    refetch: () => {
      edaQuery.refetch();
      correlationQuery.refetch();
      outliersQuery.refetch();
      cleanedDataQuery.refetch();
    }
  };
};

export default useEDA;
