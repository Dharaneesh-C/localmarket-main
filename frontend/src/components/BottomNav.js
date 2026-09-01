import React from 'react';
import { Box, Typography, Badge } from '@mui/material';
import {
  HomeRounded, PlaceRounded, ChatBubbleRounded, ReceiptLongRounded,
} from '@mui/icons-material';

const TABS = [
  { key: 'home', label: 'Home', icon: HomeRounded },
  { key: 'live', label: 'Live', icon: PlaceRounded },
  { key: 'chat', label: 'Chat', icon: ChatBubbleRounded },
  { key: 'orders', label: 'Orders', icon: ReceiptLongRounded },
];

// Fixed bottom navigation for mobile. Desktop keeps the existing top
// Tabs (Browse Products / My Orders) in BuyerPage — this component is
// hidden above the `sm` breakpoint via the `display` sx below, so the
// desktop layout is completely untouched.
export default function BottomNav({ value, onChange, hasActiveDelivery, chatBadgeCount }) {
  return (
    <Box
      component="nav"
      sx={{
        display: { xs: 'flex', sm: 'none' }, // mobile-only
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 1300,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        // Respect Android gesture-nav / safe-area inset so the bar never
        // sits under the system nav bar.
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <Box
            key={key}
            onClick={() => onChange(key)}
            sx={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center',
              py: 0.8,
              cursor: 'pointer',
              color: active ? '#1D9E75' : 'text.disabled',
              userSelect: 'none',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              {key === 'chat' && chatBadgeCount > 0 ? (
                <Badge badgeContent={chatBadgeCount} color="error"
                  sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
                  <Icon sx={{ fontSize: 24 }} />
                </Badge>
              ) : (
                <Icon sx={{ fontSize: 24 }} />
              )}
              {key === 'live' && hasActiveDelivery && (
                <Box sx={{
                  position: 'absolute', top: -1, right: -2,
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: '#FF6B35', border: '1.5px solid white',
                  animation: 'nsLiveDot 1.2s ease-in-out infinite',
                  '@keyframes nsLiveDot': {
                    '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 },
                  },
                }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: active ? 700 : 500, mt: 0.2 }}>
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
