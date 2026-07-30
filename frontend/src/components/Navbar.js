import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Box,
  Drawer, List, ListItemButton, ListItemText, Divider, Avatar,
  ListItemIcon, Chip, Switch,
} from '@mui/material';
import {
  NotificationsRounded, LogoutRounded, StorefrontRounded,
  PeopleRounded, CloseRounded, FiberManualRecordRounded,
  SettingsRounded, DarkModeRounded, LanguageRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';
import { format } from 'timeago.js';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

export default function Navbar({ onOpenSettings }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    removeNotification,
  } = useNotifications();
  const { darkMode, toggleDarkMode, language, toggleLanguage, t } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleNotifClick = (notif) => {
    markRead(notif.id);
    if (notif.product_id) navigate(`/buyer?product=${notif.product_id}`);
    setNotifOpen(false);
  };

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            background: 'linear-gradient(135deg, #1D9E75, #5DCAA5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1,
          }}>
            <StorefrontRounded sx={{ color: 'white', fontSize: 20 }} />
          </Box>

          <Typography variant="h6" fontWeight={700} color="primary.dark" sx={{ flexGrow: 1 }}>
            NearSell
          </Typography>

          {user && (
            <Chip
              label={user.role === 'merchant' ? 'Merchant' : 'Buyer'}
              size="small" color="primary" variant="outlined"
              icon={user.role === 'merchant' ? <StorefrontRounded /> : <PeopleRounded />}
            />
          )}

          {user?.role === 'buyer' && (
            <IconButton onClick={() => { setNotifOpen(true); markAllRead(); }}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsRounded />
              </Badge>
            </IconButton>
          )}

          {/* Settings icon */}
          {onOpenSettings && (
            <IconButton onClick={onOpenSettings}>
              <SettingsRounded />
            </IconButton>
          )}

          <Avatar
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', cursor: 'pointer', fontSize: 14 }}
            onClick={() => setDrawerOpen(true)}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* Notification Drawer */}
      <Drawer anchor="right" open={notifOpen} onClose={() => setNotifOpen(false)}
        PaperProps={{ sx: { width: 340 } }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Notifications</Typography>
          <IconButton onClick={() => setNotifOpen(false)}><CloseRounded /></IconButton>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsRounded sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No notifications yet</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((n) => (
              <ListItemButton key={n.id} onClick={() => handleNotifClick(n)}
                sx={{
                  bgcolor: n.read ? 'transparent' : '#E8F5F0',
                  borderBottom: '1px solid', borderColor: 'divider',
                  alignItems: 'flex-start', gap: 1,
                }}>
                {!n.read && <FiberManualRecordRounded sx={{ color: 'primary.main', fontSize: 10, mt: 1 }} />}
                <Box sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{n.body}</Typography>
                    <Typography variant="caption" color="text.disabled" display="block">
                      {n.timestamp ? format(n.timestamp) : 'just now'}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(n.id);
                    }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </Drawer>

      {/* User Menu Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton onClick={() => setDrawerOpen(false)}><CloseRounded /></IconButton>
          </Box>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24, mb: 1 }}>
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h6" fontWeight={600}>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
          <Chip label={user?.role} size="small" color="primary" sx={{ mt: 1 }} />
        </Box>
        <Divider />
        <List>
          {/* Dark Mode toggle */}
          <ListItemButton onClick={toggleDarkMode}>
            <ListItemIcon><DarkModeRounded /></ListItemIcon>
            <ListItemText primary={t('darkMode')} />
            <Switch checked={darkMode} size="small" color="primary" />
          </ListItemButton>

          {/* Language toggle */}
          <ListItemButton onClick={toggleLanguage}>
            <ListItemIcon><LanguageRounded /></ListItemIcon>
            <ListItemText
              primary={t('language')}
              secondary={language === 'en' ? 'தமிழுக்கு மாறு' : 'Switch to English'}
            />
            <Chip
              label={language === 'en' ? 'EN' : 'தமிழ்'}
              size="small" color="primary" variant="outlined"
            />
          </ListItemButton>

          {/* Settings page */}
          {onOpenSettings && (
            <ListItemButton onClick={() => { setDrawerOpen(false); onOpenSettings(); }}>
              <ListItemIcon><SettingsRounded /></ListItemIcon>
              <ListItemText primary={t('settings')} />
            </ListItemButton>
          )}

          <Divider />
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutRounded color="error" /></ListItemIcon>
            <ListItemText primary={t('logout')} primaryTypographyProps={{ color: 'error' }} />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
}
