import React from 'react';
import { Box, Typography, Badge } from '@mui/material';

// Shared responsive left-sidebar navigation for tablet/desktop (>=768px).
// Used by BOTH BuyerPage and MerchantPage — each just passes its own
// `items` array, so there's one implementation instead of two, per
// "reuse a shared responsive navigation component". Phone (<768px)
// continues to use each role's own fixed BottomNav component; this
// component renders nothing below that breakpoint.
export default function SideNav({ items, value, onChange, width = 224 }) {
  return (
    <Box
      component="nav"
      sx={{
        display: 'none',
        '@media (min-width:768px)': { display: 'flex' },
        flexDirection: 'column',
        width,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        height: '100vh',
        py: 2,
        px: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {items.map(({ key, label, icon: Icon, badge }) => {
        const active = value === key;
        return (
          <Box
            key={key}
            onClick={() => onChange(key)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              borderRadius: 2,
              px: 1.5, py: 1.2, mb: 0.5,
              cursor: 'pointer',
              bgcolor: active ? '#E1F5EE' : 'transparent',
              color: active ? '#0F6E56' : 'text.secondary',
              fontWeight: active ? 700 : 500,
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: active ? '#E1F5EE' : 'action.hover' },
            }}
          >
            {badge > 0 ? (
              <Badge badgeContent={badge} color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
                <Icon sx={{ fontSize: 22 }} />
              </Badge>
            ) : (
              <Icon sx={{ fontSize: 22 }} />
            )}
            <Typography sx={{ fontSize: 14.5, fontWeight: 'inherit' }}>{label}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
