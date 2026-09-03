// src/components/chat/MessageBubble.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Collapse,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  SmartToy as BotIcon,
  Person as UserIcon,
  ListOutlined as StepIcon,
  DescriptionOutlined as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TimerOutlined as TimerIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import type { ChatMessage } from '../../types/api';
import Markdown from '../common/Markdown';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
  message: ChatMessage;
  onSelectVis?: (type: any, data: any, label: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onSelectVis }) => {
  const theme = useTheme();
  const [metaOpen, setMetaOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isBot = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const hasMeta = isBot && !!message.agentResponse;

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVisClick = (step: string) => {
    if (!onSelectVis || !message.agentResponse) return;
    let visType: any = 'home';
    let label = 'Overview';

    if (step === 'clean_dataset') {
      visType = 'clean';
      label = 'Data Cleaning';
    } else if (step === 'run_eda') {
      visType = 'eda';
      label = 'Exploratory Data Analysis';
    } else if (step === 'generate_customer_features') {
      visType = 'features';
      label = 'Feature Engineering';
    } else if (step === 'run_segmentation') {
      visType = 'segmentation';
      label = 'Customer Segments';
    } else if (step === 'run_explainability') {
      visType = 'explain';
      label = 'Segment Profiles';
    } else if (step === 'run_recommendations') {
      visType = 'recommendations';
      label = 'Marketing Recommendations';
    }

    onSelectVis(visType, message.agentResponse, label);
  };

  if (isSystem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2, px: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: 3,
            borderColor: 'error.light',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)',
          }}
        >
          <Typography variant="body2" color="error" align="center" sx={{ fontWeight: 600 }}>
            {message.content}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isBot ? 'row' : 'row-reverse',
          gap: 1.5,
          my: 2.5,
          alignItems: 'flex-start',
        }}
      >
        <Avatar
          sx={{
            bgcolor: isBot ? 'primary.main' : 'secondary.main',
            color: isBot ? 'primary.contrastText' : 'secondary.contrastText',
            width: 36,
            height: 36,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {isBot ? <BotIcon /> : <UserIcon />}
        </Avatar>

        <Box sx={{ maxWidth: '80%', display: 'flex', flexDirection: 'column' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: isBot ? '0px 18px 18px 18px' : '18px 0px 18px 18px',
              bgcolor: isBot
                ? theme.palette.mode === 'dark'
                  ? 'background.paper'
                  : '#f1f5f9'
                : 'primary.main',
              color: isBot ? 'text.primary' : 'primary.contrastText',
              border: isBot ? `1px solid ${theme.palette.divider}` : 'none',
              boxShadow: isBot 
                ? '0 4px 20px rgba(0,0,0,0.08)' 
                : theme => theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(99, 102, 241, 0.3)'
                  : '0 4px 20px rgba(79, 70, 229, 0.25)',
              position: 'relative',
              '&:hover .copy-bubble-btn': {
                opacity: 1,
              },
            }}
          >
            {/* Custom Markdown Renderer */}
            <Markdown content={message.content} />

            {/* Quick copy bubble button */}
            {isBot && (
              <IconButton
                className="copy-bubble-btn"
                size="small"
                onClick={handleCopyText}
                sx={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  color: copied ? 'success.main' : 'text.secondary',
                }}
              >
                {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            )}
          </Paper>

          {/* Timestamp */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.6, px: 0.5, alignSelf: isBot ? 'flex-start' : 'flex-end', fontSize: '0.72rem', fontWeight: 600 }}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>

          {/* AI Action Metadata Expandable */}
          {hasMeta && message.agentResponse && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="text"
                startIcon={metaOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setMetaOpen(!metaOpen)}
                sx={{ fontWeight: 700, fontSize: '0.75rem', p: 0 }}
              >
                {metaOpen ? 'Hide Execution Trace' : 'Show Execution Trace'}
              </Button>

              <Collapse in={metaOpen}>
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 1.5,
                    p: 2,
                    borderRadius: 4,
                    borderColor: 'divider',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(9, 13, 22, 0.4)' : '#ffffff',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  {/* Intent & Time */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.5px' }}>
                      INTENT: {message.agentResponse.detected_intent}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <TimerIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {message.agentResponse.execution_time}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider />

                  {/* Steps executed */}
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, letterSpacing: '0.5px' }}>
                      <StepIcon sx={{ fontSize: 14 }} /> STEPS EXECUTED
                    </Typography>
                    <List disablePadding sx={{ mt: 0.5 }}>
                      {message.agentResponse.steps_executed.map((step, idx) => (
                        <ListItem
                          key={step}
                          disableGutters
                          sx={{ py: 0.2 }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleVisClick(step)}
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              py: 0.2,
                              px: 1.2,
                              borderRadius: 2,
                              textTransform: 'capitalize',
                            }}
                          >
                            {idx + 1}. {step.replace(/_/g, ' ')}
                          </Button>
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  {/* Artifacts generated */}
                  {message.agentResponse.generated_outputs && message.agentResponse.generated_outputs.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, letterSpacing: '0.5px' }}>
                        <FileIcon sx={{ fontSize: 14 }} /> GENERATED ARTIFACTS
                      </Typography>
                      <List disablePadding sx={{ mt: 0.5 }}>
                        {message.agentResponse.generated_outputs.map((art) => (
                          <ListItem key={art} disableGutters sx={{ py: 0.2 }}>
                            <ListItemIcon sx={{ minWidth: 20, color: 'primary.main' }}>
                              <FileIcon sx={{ fontSize: 14 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="caption" sx={{ wordBreak: 'break-all', fontWeight: 600 }}>
                                  {art.split('/').pop() || art}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Paper>
              </Collapse>
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};
export default MessageBubble;
