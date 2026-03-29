type Callback = (...args: unknown[]) => void;

const listeners = new Map<string, Set<Callback>>();
const pluginUnsubscribes = new Map<string, Set<() => void>>();

export function emit(event: string, ...args: unknown[]): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(...args);
    } catch (e) {
      console.error(`[pluginEventBus] Error in handler for "${event}":`, e);
    }
  }
}

export function on(event: string, callback: Callback): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(callback);
  return () => {
    set!.delete(callback);
    if (set!.size === 0) {
      listeners.delete(event);
    }
  };
}

export function onTracked(pluginId: string, event: string, callback: Callback): () => void {
  const unsubscribe = on(event, callback);
  let set = pluginUnsubscribes.get(pluginId);
  if (!set) {
    set = new Set();
    pluginUnsubscribes.set(pluginId, set);
  }
  set.add(unsubscribe);

  return () => {
    unsubscribe();
    const trackedSet = pluginUnsubscribes.get(pluginId);
    trackedSet?.delete(unsubscribe);
    if (trackedSet && trackedSet.size === 0) {
      pluginUnsubscribes.delete(pluginId);
    }
  };
}

export function clearPluginListeners(pluginId: string): void {
  const unsubscribes = pluginUnsubscribes.get(pluginId);
  if (!unsubscribes) {
    return;
  }

  for (const unsubscribe of unsubscribes) {
    try {
      unsubscribe();
    } catch (err) {
      console.error(`[pluginEventBus] Failed to clear listeners for "${pluginId}":`, err);
    }
  }

  pluginUnsubscribes.delete(pluginId);
}

export function clearAllListeners(): void {
  listeners.clear();
  pluginUnsubscribes.clear();
}
