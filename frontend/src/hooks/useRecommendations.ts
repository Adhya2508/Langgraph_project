// src/hooks/useRecommendations.ts
import { useQuery } from '@tanstack/react-query';
import { getRecommendations, getArtifactContent } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';

export const useRecommendations = () => {
  const recommendQuery = useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: getRecommendations,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const statsQuery = useQuery({
    queryKey: ['recommendation_statistics'],
    queryFn: () => getArtifactContent('recommendation_statistics'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const segmentRecsQuery = useQuery({
    queryKey: ['segment_recommendations'],
    queryFn: () => getArtifactContent('segment_recommendations'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const customerRecsQuery = useQuery({
    queryKey: ['customer_recommendations'],
    queryFn: () => getArtifactContent('customer_recommendations'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    recommendQuery,
    statsQuery,
    segmentRecsQuery,
    customerRecsQuery,
    recommendData: recommendQuery.data,
    statsData: statsQuery.data,
    segmentRecsData: segmentRecsQuery.data,
    customerRecsData: customerRecsQuery.data,
    isLoading: recommendQuery.isLoading || statsQuery.isLoading || segmentRecsQuery.isLoading || customerRecsQuery.isLoading,
    isError: recommendQuery.isError || statsQuery.isError || segmentRecsQuery.isError || customerRecsQuery.isError,
    error: recommendQuery.error || statsQuery.error || segmentRecsQuery.error || customerRecsQuery.error,
    refetch: () => {
      recommendQuery.refetch();
      statsQuery.refetch();
      segmentRecsQuery.refetch();
      customerRecsQuery.refetch();
    }
  };
};

export default useRecommendations;
