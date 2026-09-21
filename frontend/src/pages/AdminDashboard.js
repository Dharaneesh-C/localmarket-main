import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Grid, Chip, Alert, Button, Avatar, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, InputAdornment, Stack, Divider,
} from '@mui/material';
import {
  PeopleRounded, StorefrontRounded, ShoppingCartRounded,
  TrendingUpRounded, SearchRounded, WarningAmberRounded,
  TodayRounded, DateRangeRounded,
  RefreshRounded, GroupRounded, ReceiptLongRounded,
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Navbar from '../components/Navbar';
import {
  getAdminSummary, getAdminMerchants,
  getAdminBuyers, getAdminOrders, getAdminRevenueChart,
} from '../utils/api';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 } }}>
        <Avatar sx={{ bgcolor: color + '20', color, width: 44, height: 44, flexShrink: 0 }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} noWrap>{value}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
          {sub && <Typography variant="caption" color="primary" noWrap sx={{ display: 'block' }}>{sub}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}

const statusColor = { pending: 'warning', accepted: 'info', rejected: 'error', completed: 'success', cancelled: 'default' };

// A few readable colors for the order-status pie — cycles if more statuses
// ever appear than colors defined here.
const PIE_COLORS = ['#EF9F27', '#378ADD', '#E24B4A', '#1D9E75', '#9B59B6', '#7f8c8d'];

const currency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Unchanged from before: 5 requests total, once per load — the new
      // sections below all reuse this same data instead of adding requests.
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
      setError('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Access denied or failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(false); }, [loadAll]);

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

  // ── Derived, client-side only — reuses data already fetched above,
  // no extra API calls (per Section 8 of the spec). ──
  const last7dRevenue = revenueChart.slice(-7).reduce((sum, d) => sum + (d.revenue || 0), 0);
  const last30dRevenue = revenueChart.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const recentOrders = [...orders]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 5);

  const statusPieData = Object.entries(summary.order_status_counts || {})
    .map(([status, count]) => ({ name: status, value: count }))
    .filter((d) => d.value > 0);

  // ── Attention Required — only real, currently-true conditions. ──
  const alerts = [];
  if (summary.pending_orders > 0) {
    alerts.push({ text: `${summary.pending_orders} pending order${summary.pending_orders === 1 ? '' : 's'} awaiting merchant action`, severity: 'warning' });
  }
  if (summary.out_of_stock_products > 0) {
    alerts.push({ text: `${summary.out_of_stock_products} product${summary.out_of_stock_products === 1 ? '' : 's'} out of stock`, severity: 'error' });
  }
  if (summary.low_stock_products > 0) {
    alerts.push({ text: `${summary.low_stock_products} product${summary.low_stock_products === 1 ? '' : 's'} at ${summary.low_stock_threshold} units or fewer`, severity: 'warning' });
  }
  if (summary.inactive_products > 0) {
    alerts.push({ text: `${summary.inactive_products} inactive product${summary.inactive_products === 1 ? '' : 's'} not visible to buyers`, severity: 'info' });
  }

  const goToTab = (n) => { setTab(n); setSearch(''); window.scrollTo({ top: 600, behavior: 'smooth' }); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1.5, sm: 2, md: 3 }, overflowX: 'hidden' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>🛡️ Admin Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Platform-wide overview</Typography>
          </Box>
          <Button
            variant="outlined" size="small" onClick={() => loadAll(true)}
            startIcon={refreshing ? <CircularProgress size={14} /> : <RefreshRounded />}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </Box>

        {/* ── Summary Cards ── */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Total Users" value={summary.total_users} icon={<GroupRounded />} color="#0F6E56"
              sub={`${summary.total_merchants} merchants · ${summary.total_buyers} buyers`} />
          </Grid>
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
            <StatCard label="Total Revenue" value={currency(summary.total_revenue)} icon={<TrendingUpRounded />} color="#1D9E75" sub="completed orders" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Today's Orders" value={summary.today_orders} icon={<TodayRounded />} color="#378ADD" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Today's Revenue" value={currency(summary.today_revenue)} icon={<TodayRounded />} color="#0F6E56" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="This Week" value={summary.week_orders} icon={<DateRangeRounded />} color="#EF9F27" sub="orders, last 7 days" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="This Month" value={currency(summary.month_revenue)} icon={<DateRangeRounded />} color="#9B59B6" sub="revenue, month-to-date" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Completed" value={summary.completed_orders} icon={<ReceiptLongRounded />} color="#1D9E75" />
          </Grid>
        </Grid>

        {/* ── Attention Required ── */}
        {alerts.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={1.5}>
                ⚠️ Attention Required
              </Typography>
              <Stack spacing={1}>
                {alerts.map((a, i) => (
                  <Alert key={i} severity={a.severity} icon={<WarningAmberRounded fontSize="small" />} sx={{ py: 0.25 }}>
                    {a.text}
                  </Alert>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ── Quick Actions ── */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant={tab === 0 ? 'contained' : 'outlined'} startIcon={<StorefrontRounded />} onClick={() => goToTab(0)}>
                View Merchants
              </Button>
              <Button size="small" variant={tab === 1 ? 'contained' : 'outlined'} startIcon={<PeopleRounded />} onClick={() => goToTab(1)}>
                View Buyers
              </Button>
              <Button size="small" variant={tab === 2 ? 'contained' : 'outlined'} startIcon={<ShoppingCartRounded />} onClick={() => goToTab(2)}>
                View Orders
              </Button>
              <Button size="small" variant="outlined" startIcon={refreshing ? <CircularProgress size={14} /> : <RefreshRounded />} onClick={() => loadAll(true)} disabled={refreshing}>
                Refresh Dashboard
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* ── Revenue chart + Order status pie ── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  <Typography variant="h6" fontWeight={600}>📈 Platform Revenue — Last 30 Days</Typography>
                  <Stack direction="row" spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Last 7 days</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">{currency(last7dRevenue)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Last 30 days</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary">{currency(last30dRevenue)}</Typography>
                    </Box>
                  </Stack>
                </Box>
                {revenueChart.length === 0 || last30dRevenue === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">No completed orders in the last 30 days yet.</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={revenueChart} margin={{ left: -10, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} interval={4} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} width={56} />
                      <Tooltip
                        formatter={(v) => [currency(v), 'Revenue']}
                        labelFormatter={l => new Date(l).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={1}>Order Status</Typography>
                {statusPieData.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">No orders yet.</Typography>
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {statusPieData.map((entry, i) => (
                            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} justifyContent="center" mt={1}>
                      {statusPieData.map((d, i) => (
                        <Chip
                          key={d.name}
                          size="small"
                          label={`${d.name}: ${d.value}`}
                          sx={{ bgcolor: PIE_COLORS[i % PIE_COLORS.length] + '20', color: PIE_COLORS[i % PIE_COLORS.length], fontWeight: 600, fontSize: 11 }}
                        />
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Recent Activity — reuses the already-loaded `orders` array ── */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={1.5}>🕓 Recent Orders</Typography>
            {recentOrders.length === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>No orders yet.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f7f6' }}>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell><strong>Buyer</strong></TableCell>
                      <TableCell><strong>Merchant</strong></TableCell>
                      <TableCell align="right"><strong>Amount</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                      <TableCell><strong>Time</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map(o => (
                      <TableRow key={o.id} hover>
                        <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{o.product_title}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{o.buyer_name}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{o.merchant_name}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={700} color="primary">{currency(o.total_price)}</Typography></TableCell>
                        <TableCell align="center"><Chip label={o.status} size="small" color={statusColor[o.status] || 'default'} /></TableCell>
                        <TableCell><Typography variant="caption">{o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ mb: 3 }} />

        {/* Tabs */}
        <Box sx={{ mb: 2, overflowX: 'auto' }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
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
                        <Typography variant="body2" fontWeight={700} color="primary">{currency(m.total_revenue)}</Typography>
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
                        <Typography variant="body2" fontWeight={700} color="primary">{currency(b.total_spent)}</Typography>
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
                        <Typography variant="body2" fontWeight={700} color="primary">{currency(o.total_price)}</Typography>
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
