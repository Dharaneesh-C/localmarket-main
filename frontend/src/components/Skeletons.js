import React from 'react';
import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

// Single product card skeleton — matches the real card shape exactly
export function ProductCardSkeleton() {
  return (
    <Card>
      {/* Image area */}
      <Skeleton variant="rectangular" width="100%" height={130} />
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Top row: category chip + distance */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
          <Skeleton variant="rounded" width={80} height={20} />
          <Skeleton variant="text" width={40} />
        </Box>
        {/* Title */}
        <Skeleton variant="text" width="70%" height={24} />
        {/* Merchant + rating */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="text" width="20%" />
        </Box>
        {/* Price + badges */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Skeleton variant="text" width={60} height={32} />
          <Skeleton variant="rounded" width={40} height={18} />
        </Box>
        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1.2 }}>
          <Skeleton variant="rounded" width="50%" height={32} />
          <Skeleton variant="rounded" width="50%" height={32} />
        </Box>
      </CardContent>
    </Card>
  );
}

// Grid of N skeleton cards
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <ProductCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}

// Order card skeleton — for My Orders / Merchant Orders tabs
export function OrderCardSkeleton({ count = 4 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} key={i}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Skeleton variant="text" width="55%" height={22} />
                <Skeleton variant="rounded" width={80} height={22} />
              </Box>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="30%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Skeleton variant="rounded" width="100%" height={32} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// Stat card row skeleton — for merchant dashboard
export function StatCardsSkeleton() {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Grid item xs={6} sm={4} md={2.4} key={i}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px !important' }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="50%" height={28} />
                <Skeleton variant="text" width="80%" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
