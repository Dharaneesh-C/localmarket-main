import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Grid, Chip, Alert, Button, Avatar, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, InputAdornment,
} from '@mui/material';
import {
  PeopleRounded, StorefrontRounded, ShoppingCartRounded,
  TrendingUpRounded, SearchRounded,
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import Navbar from '../components/Navbar';
import {
  getAdminSummary, getAdminMerchants,
  getAdminBuyers, getAdminOrders, getAdminRevenueChart,
} from '../utils/api';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color + '20', color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          {sub && <Typography variant="caption" color="primary">{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

const statusColor = { pending: 'warning', accepted: 'info', rejected: 'error', completed: 'success' };

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, m, b, o, r] = await Promise.all([
        getAdminSummary(),
        getAdminMerchants(),
        getAdminBuyers(),
        getAdminOrders(),
        getAdminRevenueChart(),
      ]);
      setSummary(s.data);
      setMerchants(m.data);
      setBuyers(b.data);
      setOrders(o.data);
      setRevenueChart(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Access denied or failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>
    </Box>
  );

  if (error) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Typography variant="body2" color="text.secondary">
          Admin access is restricted. Make sure your email is in the ADMIN_EMAILS list in backend/routes/admin.py
        </Typography>
      </Box>
    </Box>
  );

  const filteredMerchants = merchants.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBuyers = buyers.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOrders = orders.filter(o =>
    o.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.merchant_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.product_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>🛡️ Admin Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Platform-wide overview</Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={loadAll}>Refresh</Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Merchants" value={summary.total_merchants} icon={<StorefrontRounded />} color="#1D9E75" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Buyers" value={summary.total_buyers} icon={<PeopleRounded />} color="#378ADD" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Products" value={summary.active_products} icon={<StorefrontRounded />} color="#9B59B6" sub={`${summary.total_products} total`} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Total Orders" value={summary.total_orders} icon={<ShoppingCartRounded />} color="#EF9F27" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Pending" value={summary.pending_orders} icon={<ShoppingCartRounded />} color="#FF6B35" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Revenue" value={`₹${summary.total_revenue}`} icon={<TrendingUpRounded />} color="#1D9E75" sub="completed orders" />
          </Grid>
        </Grid>

        {/* Platform Revenue Chart */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>📈 Platform Revenue — Last 30 Days</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} interval={4} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} labelFormatter={l => `Date: ${l}`} />
                <Line type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Box sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }}>
            <Tab label={`Merchants (${merchants.length})`} />
            <Tab label={`Buyers (${buyers.length})`} />
            <Tab label={`Orders (${orders.length})`} />
          </Tabs>
        </Box>

        {/* Search */}
        <TextField
          size="small" fullWidth
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }}
          sx={{ mb: 2 }}
        />

        {/* ── Merchants Tab ── */}
        {tab === 0 && (
          <Card>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7f6' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Phone</strong></TableCell>
                    <TableCell align="center"><strong>Products</strong></TableCell>
                    <TableCell align="center"><strong>Orders</strong></TableCell>
                    <TableCell align="right"><strong>Revenue</strong></TableCell>
                    <TableCell align="center"><strong>Rating</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMerchants.map(m => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#E1F5EE', color: '#1D9E75', fontSize: 12 }}>
                            {m.name?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>{m.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="caption">{m.email}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{m.phone || '—'}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={`${m.active_products}/${m.total_products}`} size="small"
                          sx={{ bgcolor: '#E1F5EE', color: '#0F6E56', fontSize: 10 }} />
                      </TableCell>
                      <TableCell align="center">{m.total_orders}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="primary">₹{m.total_revenue}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {m.rating_count > 0
                          ? <Chip label={`⭐ ${m.rating_avg}`} size="small" color="warning" variant="outlined" />
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMerchants.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" color="text.disabled" sx={{ py: 3 }}>No merchants found</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}

        {/* ── Buyers Tab ── */}
        {tab === 1 && (
          <Card>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7f6' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Phone</strong></TableCell>
                    <TableCell align="center"><strong>Orders</strong></TableCell>
                    <TableCell align="right"><strong>Total Spent</strong></TableCell>
                    <TableCell><strong>Joined</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBuyers.map(b => (
                    <TableRow key={b.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#E6F1FB', color: '#185FA5', fontSize: 12 }}>
                            {b.name?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>{b.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="caption">{b.email}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{b.phone || '—'}</Typography></TableCell>
                      <TableCell align="center">{b.total_orders}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="primary">₹{b.total_spent}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption">{b.joined ? b.joined.slice(0, 10) : '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                  {filteredBuyers.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="text.disabled" sx={{ py: 3 }}>No buyers found</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}

        {/* ── Orders Tab ── */}
        {tab === 2 && (
          <Card>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7f6' }}>
                    <TableCell><strong>Product</strong></TableCell>
                    <TableCell><strong>Buyer</strong></TableCell>
                    <TableCell><strong>Merchant</strong></TableCell>
                    <TableCell align="center"><strong>Qty</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{o.product_title}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{o.buyer_name}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{o.merchant_name}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption">{o.quantity} {o.unit}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="primary">₹{o.total_price}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={o.status} size="small" color={statusColor[o.status] || 'default'} />
                      </TableCell>
                      <TableCell><Typography variant="caption">{o.created_at ? o.created_at.slice(0, 10) : '—'}</Typography></TableCell>
                    </TableRow>
                  ))}
                  {filteredOrders.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center"><Typography variant="body2" color="text.disabled" sx={{ py: 3 }}>No orders found</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}

      </Box>
    </Box>
  );
}
