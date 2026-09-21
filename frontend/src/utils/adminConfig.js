// Single source of truth for "is this user the admin account?" on the
// frontend. Mirrors backend/routes/admin.py's ADMIN_EMAILS — this is
// intentionally just the email (never the password), since the frontend
// only ever needs to know how to ROUTE an already-authenticated user, not
// how to authenticate them. Actual login/authorization still happens
// entirely server-side (JWT + require_admin on every /api/admin/* route);
// this constant is used purely for client-side navigation.
export const ADMIN_EMAIL = 'nearsell.team@gmail.com';

export function isAdminUser(user) {
  return !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Where a logged-in user should land after login / on "/" / on "/auth".
// Admin takes priority over role — the seeded admin account's role is
// "buyer" (see backend/seed_admin.py), so role alone would send it to
// /buyer, which is exactly the bug this fixes.
export function getHomeRoute(user) {
  if (isAdminUser(user)) return '/admin';
  return user?.role === 'merchant' ? '/merchant' : '/buyer';
}
