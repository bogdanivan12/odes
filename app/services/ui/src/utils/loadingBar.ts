/**
 * Tiny global counter of in-flight API requests, so a top progress bar can show
 * whenever the app is fetching. `apiClient` calls start/stop around each request
 * and `<GlobalLoadingBar>` subscribes to the active state.
 */
let count = 0;
const listeners = new Set<(active: boolean) => void>();

function emit(): void {
  const active = count > 0;
  listeners.forEach((l) => l(active));
}

export function startLoading(): void {
  count += 1;
  if (count === 1) emit();
}

export function stopLoading(): void {
  count = Math.max(0, count - 1);
  if (count === 0) emit();
}

export function subscribeLoading(listener: (active: boolean) => void): () => void {
  listeners.add(listener);
  listener(count > 0);
  return () => { listeners.delete(listener); };
}
