import { useEffect, useRef } from 'react';
import { FINANCIAL_CHANGE } from '../utils/financial';

// Refresh mounted financial views after successful mutations and returning to a tab.
export default function useFinancialRefresh(refresh) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    const run = () => latest.current();
    const visible = () => { if (document.visibilityState === 'visible') run(); };
    window.addEventListener(FINANCIAL_CHANGE, run);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener(FINANCIAL_CHANGE, run);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
}
