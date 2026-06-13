"use client";

/**
 * React bindings for the local-first store. Loaders run in the browser after
 * mount (localStorage is client-only) and re-run whenever the store mutates.
 */
import * as React from "react";
import { subscribe } from "./db";

export interface LocalQuery<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Run an async loader against the local store. Re-runs on store mutation and
 * whenever a dependency in `deps` changes.
 */
export function useLocalQuery<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
): LocalQuery<T> {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  // Keep the latest loader without making it an effect dependency; re-run is
  // driven by a serialized key of `deps` and by store-mutation notifications.
  const loaderRef = React.useRef(loader);
  React.useEffect(() => {
    loaderRef.current = loader;
  });
  const depsKey = JSON.stringify(deps);

  React.useEffect(() => {
    let active = true;
    const read = () => {
      loaderRef.current()
        .then((value) => {
          if (!active) return;
          setData(value);
          setError(undefined);
          setLoading(false);
        })
        .catch((e) => {
          if (!active) return;
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        });
    };
    read();
    const unsubscribe = subscribe(read);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [depsKey]);

  return { data, loading, error };
}
