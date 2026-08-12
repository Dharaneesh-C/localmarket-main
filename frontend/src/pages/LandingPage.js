import React from 'react';
import { Box, Button, Typography, Container, Grid, Card, CardContent } from '@mui/material';
import {
  StorefrontRounded, LocalShippingRounded, NotificationsActiveRounded,
  LocationOnRounded, ArrowForwardRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: <LocationOnRounded sx={{ fontSize: 32 }} />,
    title: 'Hyperlocal',
    body: 'Discover fresh produce, dairy, and handmade goods from sellers right in your neighborhood.',
  },
  {
    icon: <NotificationsActiveRounded sx={{ fontSize: 32 }} />,
    title: 'Real-time alerts',
    body: "Get notified the instant your merchant arrives — no refreshing, no guessing.",
  },
  {
    icon: <LocalShippingRounded sx={{ fontSize: 32 }} />,
    title: 'Fast delivery',
    body: 'Set your own delivery radius and delivery windows as a merchant, or browse what\'s nearby as a buyer.',
  },
  {
    icon: <StorefrontRounded sx={{ fontSize: 32 }} />,
    title: 'For every seller',
    body: 'From a home baker to a neighborhood grocer — list your products in minutes.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorefrontRounded color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={800} color="primary.dark">NearSell</Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate('/auth?mode=login')}>
            Log In
          </Button>
        </Box>
      </Container>

      {/* Hero */}
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 } }}>
          <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '2rem', sm: '3rem' }, mb: 2 }}>
            Your neighborhood market,<br />just a tap away
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 4, maxWidth: 560, mx: 'auto' }}>
            NearSell connects buyers with local merchants nearby — fresh groceries,
            home-cooked food, and handmade goods, delivered fast.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="large"
              variant="contained"
              endIcon={<ArrowForwardRounded />}
              onClick={() => navigate('/auth?mode=signup&role=buyer')}
            >
              Start Shopping
            </Button>
            <Button
              size="large"
              variant="outlined"
              onClick={() => navigate('/auth?mode=signup&role=merchant')}
            >
              Sell on NearSell
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Features */}
      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Grid container spacing={3}>
          {features.map((f) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ color: 'primary.main', mb: 1.5 }}>{f.icon}</Box>
                  <Typography variant="subtitle1" fontWeight={700} mb={1}>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.body}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer CTA */}
      <Box sx={{ bgcolor: '#0F6E56', color: 'white', py: 6, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} mb={1}>Ready to get started?</Typography>
        <Typography sx={{ mb: 3, opacity: 0.9 }}>Join NearSell in less than a minute.</Typography>
        <Button
          size="large"
          variant="contained"
          sx={{ bgcolor: 'white', color: '#0F6E56', '&:hover': { bgcolor: '#E1F5EE' } }}
          onClick={() => navigate('/auth?mode=signup')}
        >
          Create Free Account
        </Button>
      </Box>
    </Box>
  );
}
