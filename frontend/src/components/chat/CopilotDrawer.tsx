// src/components/chat/CopilotDrawer.tsx
import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Fab,
  IconButton,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  SmartToy as CopilotIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAgent } from '../../hooks/useAgent';
import MessageBubble from './MessageBubble';
import SuggestedPrompts from './SuggestedPrompts';
import TypingIndicator from './TypingIndicator';

export const CopilotDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, isPending } = useAgent();

  const handleSend = () => {
    if (!input.trim() || isPending) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) in bottom right corner */}
      <Fab
        color="primary"
        aria-label="open copilot assistant"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          zIndex: 1100,
        }}
      >
        <CopilotIcon />
      </Fab>

      {/* Slide-out Microsoft Copilot Assistant Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420 },
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid',
              borderColor: 'divider',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
            }
          }
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CopilotIcon color="primary" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Copilot Assistant
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Enterprise Segment Intelligence
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Chat History Panel */}
        <Box sx={{ flexGrow: 1, p: 2.5, overflowY: 'auto', bgcolor: 'background.default' }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isPending && <TypingIndicator />}
        </Box>

        <Divider />

        {/* Input Panel */}
        <Box sx={{ p: 2.5, bgcolor: 'background.paper' }}>
          {messages.length <= 1 && !isPending && (
            <SuggestedPrompts onSelectPrompt={sendMessage} disabled={isPending} />
          )}

          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask Copilot about customer groups..."
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
                        borderRadius: 2.5,
                        p: 1,
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3.5,
                  pr: 1,
                },
              }
            } as any)}
          />
        </Box>
      </Drawer>
    </>
  );
};
export default CopilotDrawer;
