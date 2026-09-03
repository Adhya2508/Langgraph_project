// src/components/chat/SuggestedPrompts.tsx
import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { ChatBubbleOutlineOutlined as ChatIcon } from '@mui/icons-material';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onSelectPrompt, disabled }) => {
  const prompts = [
    'Segment my bank customers',
    'Explain cluster traits',
    'Recommend product offerings',
    'Run complete customer pipeline',
    'Show Exploratory Data Analysis',
  ];

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700, letterSpacing: '0.5px' }}>
        SUGGESTED ACTIONS
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {prompts.map((prompt) => (
          <Chip
            key={prompt}
            icon={<ChatIcon sx={{ fontSize: '14px !important' }} />}
            label={prompt}
            onClick={() => !disabled && onSelectPrompt(prompt)}
            disabled={disabled}
            clickable
            color="primary"
            variant="outlined"
            sx={{
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: '8px',
              px: 0.5,
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(129, 140, 248, 0.15)',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
export default SuggestedPrompts;
