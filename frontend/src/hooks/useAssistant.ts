// src/hooks/useAssistant.ts
import { useAgent } from './useAgent';

export const useAssistant = () => {
  const agent = useAgent();
  return {
    messages: agent.messages,
    sendMessage: agent.sendMessage,
    isPending: agent.isPending,
    activeVis: agent.activeVis,
    setActiveVis: agent.setActiveVis,
    clearConversation: agent.clearConversation,
  };
};

export default useAssistant;
