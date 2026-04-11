import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for async data fetching with loading/error states.
 * Replaces the repeated pattern of useState(data) + useState(loading) + useState(error) + useEffect.
 *
 * @param {Function} fetchFn - Async function that returns data. Called on mount and when deps change.
 * @param {Array} deps - Dependency array that triggers re-fetch when changed.
 * @param {*} initialData - Initial value for data (default: null).
 * @returns {{ data, loading, error, reload, setData }}
 */
export function useAsyncData(fetchFn, deps = [], initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  // Reload without showing loading spinner (for background refreshes after CRUD)
  const reload = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchRef.current();
      setData(result);
    } catch (err) {
      console.error('useAsyncData reload error:', err);
      setError(err.message || 'Unknown error');
    }
  }, []);

  // Initial load + re-fetch on deps change (shows loading spinner)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchRef.current();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          console.error('useAsyncData error:', err);
          setError(err.message || 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload, setData };
}
