// src/hooks/useAgent.ts
import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runAgent } from '../api/endpoints';
import type { ChatMessage, AgentResponse } from '../types/api';

export type VisType = 'home' | 'clean' | 'eda' | 'features' | 'segmentation' | 'explain' | 'recommendations';

export const useAgent = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem('agent-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      } catch {
        return [];
      }
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your Bank Customer Segmentation Assistant. Upload a bank dataset to get started, or ask me to perform tasks like cleaning, statistical analysis, customer segmentation, or marketing recommendations.',
        timestamp: new Date(),
      },
    ];
  });

  const [activeVis, setActiveVis] = useState<{ type: VisType; data: any; label: string }>({
    type: 'home',
    data: null,
    label: 'Overview',
  });

  useEffect(() => {
    sessionStorage.setItem('agent-messages', JSON.stringify(messages));
  }, [messages]);

  const mutation = useMutation<AgentResponse, Error, string>({
    mutationFn: runAgent,
    onMutate: (query) => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.final_response,
        timestamp: new Date(),
        agentResponse: data,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.steps_executed && data.steps_executed.length > 0) {
        const lastStep = data.steps_executed[data.steps_executed.length - 1];
        let visType: VisType = 'home';
        let label = 'Overview';

        if (lastStep === 'clean_dataset') {
          visType = 'clean';
          label = 'Data Cleaning';
        } else if (lastStep === 'run_eda') {
          visType = 'eda';
          label = 'Exploratory Data Analysis';
        } else if (lastStep === 'generate_customer_features') {
          visType = 'features';
          label = 'Feature Engineering';
        } else if (lastStep === 'run_segmentation') {
          visType = 'segmentation';
          label = 'Customer Segments';
        } else if (lastStep === 'run_explainability') {
          visType = 'explain';
          label = 'Segment Profiles';
        } else if (lastStep === 'run_recommendations') {
          visType = 'recommendations';
          label = 'Marketing Recommendations';
        }

        setActiveVis({
          type: visType,
          data: data,
          label: label,
        });
      }
    },
    onError: (error) => {
      const errorMessage: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || mutation.isPending) return;
      mutation.mutate(content);
    },
    [mutation]
  );

  const clearConversation = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your Bank Customer Segmentation Assistant. Upload a bank dataset to get started, or ask me to perform tasks like cleaning, statistical analysis, customer segmentation, or marketing recommendations.',
        timestamp: new Date(),
      },
    ]);
    setActiveVis({
      type: 'home',
      data: null,
      label: 'Overview',
    });
    sessionStorage.removeItem('agent-messages');
  }, []);

  return {
    messages,
    sendMessage,
    isPending: mutation.isPending,
    activeVis,
    setActiveVis,
    clearConversation,
  };
};
export default useAgent;
