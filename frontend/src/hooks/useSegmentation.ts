// src/hooks/useSegmentation.ts
import { useQuery } from '@tanstack/react-query';
import { getSegmentation, getExplainability, getArtifactContent } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';

export const useSegmentation = () => {
  const segmentationQuery = useQuery({
    queryKey: queryKeys.segmentation,
    queryFn: getSegmentation,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const explainQuery = useQuery({
    queryKey: queryKeys.explainability,
    queryFn: getExplainability,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const summaryQuery = useQuery({
    queryKey: ['cluster_summary'],
    queryFn: () => getArtifactContent('cluster_summary'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const evaluationQuery = useQuery({
    queryKey: ['evaluation_report'],
    queryFn: () => getArtifactContent('evaluation_report'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const mappingQuery = useQuery({
    queryKey: ['segment_mapping'],
    queryFn: () => getArtifactContent('segment_mapping'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const scaledQuery = useQuery({
    queryKey: ['scaled_features'],
    queryFn: () => getArtifactContent('scaled_features'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const cleanedQuery = useQuery({
    queryKey: ['cleaned_dataset'],
    queryFn: () => getArtifactContent('cleaned_dataset'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const explanationsQuery = useQuery({
    queryKey: ['cluster_explanations'],
    queryFn: () => getArtifactContent('cluster_explanations'),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    segmentQuery: segmentationQuery,
    explainQuery: explainQuery,
    summaryQuery: summaryQuery,
    evaluationQuery: evaluationQuery,
    mappingQuery: mappingQuery,
    scaledQuery: scaledQuery,
    cleanedQuery,
    explanationsQuery,
    segmentData: segmentationQuery.data,
    explainData: explainQuery.data,
    clusterSummary: summaryQuery.data,
    evaluationReport: evaluationQuery.data,
    segmentMapping: mappingQuery.data,
    scaledFeatures: scaledQuery.data,
    cleanedData: cleanedQuery.data,
    clusterExplanations: explanationsQuery.data,
    isLoading: segmentationQuery.isLoading || explainQuery.isLoading || summaryQuery.isLoading || evaluationQuery.isLoading || mappingQuery.isLoading || scaledQuery.isLoading || cleanedQuery.isLoading || explanationsQuery.isLoading,
    isError: segmentationQuery.isError || explainQuery.isError || summaryQuery.isError || evaluationQuery.isError || mappingQuery.isError || scaledQuery.isError || cleanedQuery.isError || explanationsQuery.isError,
    error: segmentationQuery.error || explainQuery.error || summaryQuery.error || evaluationQuery.error || mappingQuery.error || scaledQuery.error || cleanedQuery.error || explanationsQuery.error,
    refetch: () => {
      segmentationQuery.refetch();
      explainQuery.refetch();
      summaryQuery.refetch();
      evaluationQuery.refetch();
      mappingQuery.refetch();
      scaledQuery.refetch();
      cleanedQuery.refetch();
      explanationsQuery.refetch();
    }
  };
};

export default useSegmentation;
