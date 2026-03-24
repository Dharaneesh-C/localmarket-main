import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography,
  Grid, Chip, Alert, Button, Avatar, Skeleton,
} from '@mui/material';
import {
  TrendingUpRounded, ShoppingCartRounded, InventoryRounded,
  StarRounded, BarChartRounded,
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Navbar from '../components/Navbar';
import { getMerchantAnalytics } from '../utils/api';

const COLORS = ['#1D9E75', '#FF6B35', '#378ADD', '#EF9F27', '#9B59B6'];

function StatCard({ label, value, icon, color, sub }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color + '20', color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function MerchantAnalyticsPage({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMerchantAnalytics()
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Header skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box><Skeleton width={200} height={36} /><Skeleton width={160} height={20} /></Box>
          <Skeleton variant="rounded" width={80} height={36} />
        </Box>
        {/* Stat cards skeleton */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card><CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={32} />
                  <Skeleton width="80%" height={18} />
                </Box>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
        {/* Chart skeleton */}
        <Card sx={{ mb: 3 }}><CardContent>
          <Skeleton width={200} height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={260} sx={{ borderRadius: 2 }} />
        </CardContent></Card>
        {/* Two column skeletons */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[0, 1].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Card><CardContent>
                <Skeleton width={180} height={28} sx={{ mb: 2 }} />
                {Array.from({ length: 4 }).map((_, j) => (
                  <Box key={j} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Skeleton width="55%" /><Skeleton width="25%" />
                  </Box>
                ))}
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );

  if (error) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={onBack} sx={{ mt: 2 }}>← Back</Button>
      </Box>
    </Box>
  );

  const { summary, revenue_chart, best_selling, peak_hours, category_breakdown } = data;

  // Find peak hour
  const peakHour = peak_hours.reduce((a, b) => a.orders > b.orders ? a : b, { orders: 0, label: 'N/A' });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>📊 My Analytics</Typography>
            <Typography variant="body2" color="text.secondary">Last 30 days performance</Typography>
          </Box>
          <Button variant="outlined" onClick={onBack}>← Back</Button>
        </Box>

        {/* Today's Quick Summary */}
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const todayOrders = data.revenue_chart.find(d => d.date === today);
          const todayRevenue = todayOrders?.revenue || 0;
          const todayCount = todayOrders?.orders || 0;
          return todayCount > 0 ? (
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1D9E75, #5DCAA5)', color: 'white' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>TODAY'S SUMMARY</Typography>
                  <Typography variant="h4" fontWeight={800}>₹{todayRevenue}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>{todayCount} order{todayCount !== 1 ? 's' : ''} today</Typography>
                </Box>
                <Box sx={{ fontSize: 48 }}>📈</Box>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Total Revenue" value={`₹${summary.total_revenue}`} icon={<TrendingUpRounded />} color="#1D9E75" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Total Orders" value={summary.total_orders} icon={<ShoppingCartRounded />} color="#378ADD" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Completed" value={summary.completed_orders} icon={<ShoppingCartRounded />} color="#1D9E75" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Avg Order" value={`₹${summary.avg_order_value}`} icon={<BarChartRounded />} color="#EF9F27" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Products" value={`${summary.active_products}/${summary.total_products}`} icon={<InventoryRounded />} color="#9B59B6" sub="active/total" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Peak Hour" value={peakHour.label} icon={<StarRounded />} color="#FF6B35" sub={`${peakHour.orders} orders`} />
          </Grid>
        </Grid>

        {/* Revenue Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>📈 Revenue — Last 30 Days</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }}
                  tickFormatter={v => v.slice(5)} interval={4} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} labelFormatter={l => `Date: ${l}`} />
                <Line type="monotone" dataKey="revenue" stroke="#1D9E75"
                  strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Best Selling Products */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>🏆 Best Selling Products</Typography>
                {best_selling.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No completed orders yet</Typography>
                ) : (
                  best_selling.map((p, i) => (
                    <Box key={p.product_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: i < best_selling.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length], fontSize: 13, fontWeight: 700 }}>
                          {i + 1}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 160 }}>{p.title}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={700} color="primary">₹{p.revenue}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.quantity} units</Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Category Breakdown Pie */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>🥧 Revenue by Category</Typography>
                {category_breakdown.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No data yet</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={category_breakdown} dataKey="revenue" nameKey="category"
                        cx="50%" cy="50%" outerRadius={75} label={({ category, percent }) =>
                          `${category.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                        {category_breakdown.map((entry, i) => (
                          <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Peak Hours Bar Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>⏰ Peak Hours (Orders by Hour)</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peak_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Bar dataKey="orders" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Chips */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>📦 Order Status Breakdown</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { label: 'Pending', count: summary.pending_orders, color: 'warning' },
                { label: 'Completed', count: summary.completed_orders, color: 'success' },
                { label: 'Rejected', count: summary.rejected_orders, color: 'error' },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center' }}>
                  <Chip label={`${s.label}: ${s.count}`} color={s.color} variant="outlined" />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

      </Box>
    </Box>
  );
}
