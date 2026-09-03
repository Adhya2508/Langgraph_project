// src/components/chat/ChatPanel.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  useTheme,
  Typography,
  Divider,
} from '@mui/material';
import { Send as SendIcon, DeleteOutlined as ClearIcon } from '@mui/icons-material';
import MessageBubble from './MessageBubble';
import SuggestedPrompts from './SuggestedPrompts';
import TypingIndicator from './TypingIndicator';
import type { ChatMessage } from '../../types/api';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isPending: boolean;
  onSelectVis?: (type: any, data: any, label: string) => void;
  onClearChat?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isPending,
  onSelectVis,
  onClearChat,
}) => {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending]);

  const handleSend = () => {
    if (!input.trim() || isPending) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      {/* Panel Header */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            AI Orchestrator
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Type queries to run customer segmentation tasks
          </Typography>
        </Box>
        {onClearChat && messages.length > 1 && (
          <IconButton size="small" onClick={onClearChat} color="error" title="Clear chat history">
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Message List */}
      <Box sx={{ flexGrow: 1, p: 2.5, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSelectVis={onSelectVis} />
        ))}
        {isPending && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input area */}
      <Box sx={{ p: 2.5, bgcolor: 'background.paper' }}>
        {messages.length <= 1 && !isPending && (
          <SuggestedPrompts onSelectPrompt={onSendMessage} disabled={isPending} />
        )}
        
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask AI to segment bank customers or describe insights..."
          variant="outlined"
          disabled={isPending}
          {...({
            InputProps: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={!input.trim() || isPending}
                    sx={{
                      bgcolor: input.trim() && !isPending ? 'primary.main' : 'transparent',
                      color: input.trim() && !isPending ? 'primary.contrastText' : 'text.disabled',
                      '&:hover': {
                        bgcolor: input.trim() && !isPending ? 'primary.dark' : 'transparent',
                      },
                      borderRadius: 2,
                      p: 1,
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 3,
                pr: 1,
              },
            }
          } as any)}
        />
      </Box>
    </Box>
  );
};
export default ChatPanel;
