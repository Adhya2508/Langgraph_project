// src/components/chat/TypingIndicator.tsx
import React from 'react';
import { Box, Paper, Avatar, useTheme } from '@mui/material';
import { SmartToy as BotIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

export const TypingIndicator: React.FC = () => {
  const theme = useTheme();

  const dotTransition: any = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: 'reverse',
    ease: 'easeInOut',
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, my: 2.5, alignItems: 'flex-start' }}>
      <Avatar
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          width: 36,
          height: 36,
        }}
      >
        <BotIcon />
      </Avatar>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: '0px 16px 16px 16px',
          bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#f1f5f9',
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0.8,
          height: 48,
        }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
            }}
            animate={{ y: [0, -6, 0] }}
            transition={{
              ...dotTransition,
              delay: index * 0.15,
            }}
          />
        ))}
      </Paper>
    </Box>
  );
};
export default TypingIndicator;
