import React from 'react';
import { Box, Typography, Badge } from '@mui/material';
import {
  HomeRounded, Inventory2Rounded, ChatBubbleRounded, PersonRounded,
} from '@mui/icons-material';

const TABS = [
  { key: 'home', label: 'Home', icon: HomeRounded },
  { key: 'orders', label: 'Orders', icon: Inventory2Rounded },
  { key: 'chat', label: 'Chat', icon: ChatBubbleRounded },
  { key: 'profile', label: 'Profile', icon: PersonRounded },
];

// Merchant mobile bottom nav. Same design language as the buyer BottomNav
// (components/BottomNav.js) but a distinct component since the two roles
// have different tabs/labels — kept separate rather than parameterizing one
// component into two shapes, per "don't copy buyer-specific content into
// the merchant UI" and to keep each role's nav independently editable.
export default function MerchantBottomNav({ value, onChange, pendingOrdersCount, chatBadgeCount }) {
  return (
    <Box
      component="nav"
      sx={{
        display: { xs: 'flex', sm: 'none' }, // mobile-only; desktop keeps existing Tabs
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 1300,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        const badgeCount = key === 'orders' ? pendingOrdersCount : key === 'chat' ? chatBadgeCount : 0;
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
            {badgeCount > 0 ? (
              <Badge badgeContent={badgeCount} color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
                <Icon sx={{ fontSize: 24 }} />
              </Badge>
            ) : (
              <Icon sx={{ fontSize: 24 }} />
            )}
            <Typography sx={{ fontSize: 10.5, fontWeight: active ? 700 : 500, mt: 0.2 }}>
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
