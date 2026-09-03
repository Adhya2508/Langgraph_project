// src/api/endpoints.ts
// Re-export services APIs for backward compatibility with existing hooks
export { checkHealth, cleanDataset, runFeatures, getCustomerProfile, getArtifactContent } from '../services/dashboard.service';
export { uploadDataset } from '../services/upload.service';
export { runEDA, getEDA } from '../services/eda.service';
export { runSegmentation, runExplainability, getSegmentation, getExplainability } from '../services/segmentation.service';
export { runRecommendations, getRecommendations } from '../services/recommendation.service';
export { runAgent } from '../services/assistant.service';
export { apiClient } from '../services/axios';
