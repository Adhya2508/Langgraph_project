// src/components/common/Markdown.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Divider,
} from '@mui/material';
import { ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedBlock(id);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  const renderContent = () => {
    if (!content) return null;

    // Split content by code blocks: ```[lang] code ```
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }

      parts.push({
        type: 'code',
        language: match[1] || 'plaintext',
        content: match[2].trim(),
        rawIndex: match.index,
      });

      lastIndex = codeBlockRegex.lastIndex;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }

    return parts.map((part, partIdx) => {
      if (part.type === 'code') {
        const id = `code-${part.rawIndex}-${partIdx}`;
        const isCopied = copiedBlock === id;

        return (
          <Paper
            key={id}
            variant="outlined"
            sx={{
              my: 2,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: theme => theme.palette.mode === 'dark' ? '#0b0f19' : '#f8fafc',
            }}
          >
            {/* Header bar */}
            <Box
              sx={{
                px: 2,
                py: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: theme => theme.palette.mode === 'dark' ? '#101725' : '#f1f5f9',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', color: 'text.secondary' }}>
                {part.language}
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={isCopied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                onClick={() => handleCopyCode(part.content || '', id)}
                sx={{
                  py: 0.25,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: isCopied ? 'success.main' : 'text.secondary',
                }}
              >
                {isCopied ? 'Copied!' : 'Copy code'}
              </Button>
            </Box>
            {/* Code contents */}
            <Box sx={{ p: 2, overflowX: 'auto' }}>
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                  fontSize: '0.85rem',
                  m: 0,
                  color: theme => theme.palette.mode === 'dark' ? '#cbd5e1' : '#334155',
                }}
              >
                {part.content}
              </Typography>
            </Box>
          </Paper>
        );
      }

      // Handle text part: parse line by line to support Markdown titles, tables, list items
      // Inline parser to tokenise bold, italics, and markdown links
      const parseInline = (text: string): React.ReactNode[] => {
        const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
        const tokens = text.split(tokenRegex);
        
        return tokens.map((token, idx) => {
          if (token.startsWith('**') && token.endsWith('**')) {
            return <strong key={idx} style={{ fontWeight: 700 }}>{token.slice(2, -2)}</strong>;
          }
          if (token.startsWith('*') && token.endsWith('*')) {
            return <em key={idx}>{token.slice(1, -1)}</em>;
          }
          if (token.startsWith('[') && token.includes('](')) {
            const match = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match) {
              return (
                <Typography
                  key={idx}
                  component="a"
                  href={match[2]}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline',
                    fontWeight: 600,
                    display: 'inline',
                    fontSize: 'inherit',
                  }}
                >
                  {match[1]}
                </Typography>
              );
            }
          }
          return token;
        });
      };

      const lines = part.content.split('\n');
      let currentTable: { headers: string[]; rows: string[][] } | null = null;
      const elements: React.ReactNode[] = [];

      const flushTable = (key: string) => {
        if (!currentTable) return;
        const table = currentTable;
        currentTable = null;

        elements.push(
          <TableContainer key={key} component={Paper} variant="outlined" sx={{ my: 2.5, borderRadius: 3 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  {table.headers.map((h, i) => (
                    <TableCell key={i} sx={{ fontWeight: 700 }}>{h.trim()}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.rows.map((row, i) => (
                  <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx}>{parseInline(cell)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      };

      lines.forEach((line, lineIdx) => {
        const key = `line-${partIdx}-${lineIdx}`;
        const trimmed = line.trim();

        // 1. Markdown Table Row: | Col 1 | Col 2 |
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cells = trimmed.split('|').slice(1, -1);
          
          if (cells.every(c => c.trim().match(/^-+$/))) {
            return;
          }

          if (!currentTable) {
            currentTable = { headers: cells, rows: [] };
          } else {
            currentTable.rows.push(cells);
          }
          return;
        }

        if (currentTable) {
          flushTable(`${key}-flush`);
        }

        // 2. Markdown Headers: # Title, ## Subtitle
        if (trimmed.startsWith('# ')) {
          elements.push(
            <Typography key={key} variant="h5" sx={{ fontWeight: 800, mt: 2.5, mb: 1 }}>
              {parseInline(trimmed.substring(2))}
            </Typography>
          );
        } else if (trimmed.startsWith('## ')) {
          elements.push(
            <Typography key={key} variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 0.8 }}>
              {parseInline(trimmed.substring(3))}
            </Typography>
          );
        } else if (trimmed.startsWith('### ')) {
          elements.push(
            <Typography key={key} variant="subtitle1" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
              {parseInline(trimmed.substring(4))}
            </Typography>
          );
        }
        // 3. Bullet list item: - Item, * Item
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          elements.push(
            <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', ml: 2, my: 0.5, gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.8, flexShrink: 0 }} />
              <Typography variant="body2">{parseInline(trimmed.substring(2))}</Typography>
            </Box>
          );
        }
        // 4. Ordered/Numbered list item: 1. Item
        else if (trimmed.match(/^\d+\.\s/)) {
          const match = trimmed.match(/^(\d+)\.\s/);
          const indexStr = match ? match[1] : '1';
          const content = trimmed.replace(/^\d+\.\s/, '');
          elements.push(
            <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', ml: 2, my: 0.5, gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', flexShrink: 0, minWidth: 16 }}>
                {indexStr}.
              </Typography>
              <Typography variant="body2">{parseInline(content)}</Typography>
            </Box>
          );
        }
        // 5. Line break separator: ---
        else if (trimmed === '---') {
          elements.push(<Divider key={key} sx={{ my: 2 }} />);
        }
        // 6. Normal paragraphs
        else if (trimmed) {
          elements.push(
            <Typography key={key} variant="body2" sx={{ my: 1, whiteSpace: 'pre-line' }}>
              {parseInline(trimmed)}
            </Typography>
          );
        }
      });

      if (currentTable) {
        flushTable(`part-${partIdx}-trailing`);
      }

      return <Box key={`text-${partIdx}`}>{elements}</Box>;
    });
  };

  return <Box className="markdown-body">{renderContent()}</Box>;
};
export default Markdown;
