import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: Boolean(path), error: null });
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    api
      .get<T>(path, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if ((error as Error)?.name === 'AbortError') return;
        const message =
          error instanceof ApiError
            ? error.status === 401
              ? '请先登录后查看'
              : error.message
            : '加载失败，请稍后再试';
        setState({ data: null, loading: false, error: message });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  return { ...state, reload };
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}