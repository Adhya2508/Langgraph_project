// src/services/assistant.service.ts
import apiClient from './axios';
import type { AgentResponse } from '../types/api';

export const runAgent = async (query: string): Promise<AgentResponse> => {
  const { data } = await apiClient.post<AgentResponse>('/agent', { query });
  return data;
};
