import MainLayout from '../layout/MainLayout';
import { LandingPage } from './Home';
import { isAuthenticated } from '../../utils/auth';

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
