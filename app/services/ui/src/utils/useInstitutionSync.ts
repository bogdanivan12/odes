import { useEffect } from 'react';

/**
 * Whenever `institutionId` becomes available (e.g. after an API load),
 * write it to localStorage and fire the `institutionSelected` event so
 * the navbar automatically highlights the correct institution.
 */
export function useInstitutionSync(institutionId: string | null | undefined) {
  useEffect(() => {
    if (!institutionId) return;
    try {
      localStorage.setItem('selectedInstitutionId', institutionId);
      window.dispatchEvent(
        new CustomEvent('institutionSelected', { detail: { id: institutionId } }),
      );
    } catch (_) { /* ignore */ }
  }, [institutionId]);
}
