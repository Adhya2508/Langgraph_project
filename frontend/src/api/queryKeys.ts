// src/api/queryKeys.ts
// Centralized React Query key constants — prevents typo-based cache mismatches.

export const queryKeys = {
  health: ['health'] as const,
  upload: ['upload'] as const,
  clean: ['clean'] as const,
  eda: ['eda'] as const,
  features: ['features'] as const,
  segmentation: ['segmentation'] as const,
  explainability: ['explainability'] as const,
  recommendations: ['recommendations'] as const,
  agent: (query: string) => ['agent', query] as const,
  pipelineHistory: ['pipeline-history'] as const,
};
