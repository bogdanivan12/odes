import MainLayout from '../layout/MainLayout';
import { LandingPage } from './Home';

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const t = localStorage.getItem('authToken');
  return !!t && t.trim().length > 0;
}

/**
 * Root route component for "/".
 *
 * - Not authenticated → public landing page without any navbar.
 * - Authenticated → same landing page inside MainLayout (navbar included),
 *   with institution-oriented CTAs instead of sign-in buttons.
 */
export default function RootPage() {
  if (!isAuthenticated()) {
    return <LandingPage />;
  }
  return (
    <MainLayout>
      <LandingPage isLoggedIn />
    </MainLayout>
  );
}
