import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { PublicClientApplication } from '@azure/msal-browser';
import { MICROSOFT_AUTHORITY, MICROSOFT_CLIENT_ID } from '../../config/constants';

// Single MSAL instance for the app. MSAL v4 requires initialize() before use,
// so we memoise the init promise and reuse it across button clicks.
let initPromise: Promise<PublicClientApplication> | null = null;
function getMsal(): Promise<PublicClientApplication> {
  if (!initPromise) {
    const instance = new PublicClientApplication({
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: MICROSOFT_AUTHORITY,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    initPromise = instance.initialize().then(() => instance);
  }
  return initPromise;
}

/** Official Microsoft brand mark (four coloured squares). */
function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/**
 * Renders a "Continue with Microsoft" button.  On success it hands the Entra ID
 * ID token to `onCredential` (which the caller POSTs to the API).
 */
export default function MicrosoftSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const msal = await getMsal();
      const result = await msal.loginPopup({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
      });
      if (result.idToken) onCredential(result.idToken);
      else onError?.('Microsoft did not return a token.');
    } catch (e) {
      // The user closing the popup is not a real error - stay quiet for those.
      const code = (e as { errorCode?: string }).errorCode ?? '';
      if (!['user_cancelled', 'popup_window_error', 'interaction_in_progress'].includes(code)) {
        onError?.((e as Error).message || 'Microsoft sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <MicrosoftLogo />}
        sx={{
          width: 320,
          maxWidth: '100%',
          height: 40,
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: 1,
          color: 'text.primary',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
        }}
      >
        Continue with Microsoft
      </Button>
    </Box>
  );
}
