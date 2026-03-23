import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton,
  CircularProgress, Avatar, Chip,
} from '@mui/material';
import { SendRounded } from '@mui/icons-material';
import { sendMessage, getMessages } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function OrderChat({ orderId, orderStatus }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getMessages(orderId);
      setMessages(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    // Poll every 5 seconds while order is active
    if (['pending', 'accepted'].includes(orderStatus)) {
      intervalRef.current = setInterval(load, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [load, orderStatus]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await sendMessage(orderId, trimmed);
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isMine = (msg) => msg.sender_id === user?.id;

  return (
    <Box sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#1D9E75', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography fontSize={13} fontWeight={700} color="white">💬 Chat</Typography>
        <Chip label={`${messages.length} messages`} size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 10, height: 18 }} />
      </Box>

      {/* Messages */}
      <Box sx={{ height: 200, overflowY: 'auto', p: 1.5, bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <Typography variant="caption" color="text.disabled">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          messages.map(msg => (
            <Box key={msg.id} sx={{
              display: 'flex',
              justifyContent: isMine(msg) ? 'flex-end' : 'flex-start',
              mb: 1,
            }}>
              {!isMine(msg) && (
                <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#FF6B35', mr: 0.8, mt: 0.3 }}>
                  {msg.sender_name?.[0]?.toUpperCase()}
                </Avatar>
              )}
              <Box sx={{ maxWidth: '75%' }}>
                {!isMine(msg) && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {msg.sender_name} · {msg.sender_role}
                  </Typography>
                )}
                <Box sx={{
                  bgcolor: isMine(msg) ? '#1D9E75' : 'background.paper',
                  color: isMine(msg) ? 'white' : 'text.primary',
                  px: 1.5, py: 0.8,
                  borderRadius: isMine(msg) ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  boxShadow: 1,
                }}>
                  <Typography variant="body2" fontSize={13}>{msg.text}</Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{
                  display: 'block', mt: 0.2,
                  textAlign: isMine(msg) ? 'right' : 'left', fontSize: 10,
                }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 0.5, p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <TextField
          size="small" fullWidth
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline maxRows={3}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 13 } }}
        />
        <IconButton onClick={handleSend} disabled={sending || !text.trim()}
          sx={{ bgcolor: '#1D9E75', color: 'white', '&:hover': { bgcolor: '#0F6E56' }, alignSelf: 'flex-end' }}>
          {sending ? <CircularProgress size={18} color="inherit" /> : <SendRounded fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
}
