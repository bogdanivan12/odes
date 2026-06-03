import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { GOOGLE_CLIENT_ID } from '../../config/constants';

// Minimal typing for the Google Identity Services global.
interface GoogleId {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (resp: { credential?: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window { google?: GoogleId }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Sign-In.'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/**
 * Renders the official "Sign in with Google" button.  On success it hands the
 * ID-token credential to `onCredential` (which the caller POSTs to the API).
 */
export default function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => { if (resp.credential) onCredential(resp.credential); },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
      })
      .catch((e) => onError?.((e as Error).message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Box ref={ref} sx={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />;
}
