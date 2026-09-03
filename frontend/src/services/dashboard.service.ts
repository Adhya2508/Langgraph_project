// src/services/dashboard.service.ts
import apiClient from './axios';
import type { StatusResponse, CleanResponse, FeatureResponse } from '../types/api';

export const checkHealth = async (): Promise<StatusResponse> => {
  const { data } = await apiClient.get<StatusResponse>('/');
  return data;
};

export const cleanDataset = async (): Promise<CleanResponse> => {
  const { data } = await apiClient.post<CleanResponse>('/clean');
  return data;
};

export const runFeatures = async (): Promise<FeatureResponse> => {
  const { data } = await apiClient.post<FeatureResponse>('/features');
  return data;
};

export const getCustomerProfile = async (customerId: string): Promise<any> => {
  const { data } = await apiClient.get<any>(`/customer/${customerId}`);
  return data;
};

export const getArtifactContent = async (name: string): Promise<any> => {
  const { data } = await apiClient.get<any>(`/artifact/${name}`);
  return data;
};


