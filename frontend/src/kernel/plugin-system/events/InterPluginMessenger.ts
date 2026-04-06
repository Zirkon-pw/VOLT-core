const CHANNEL_PREFIX = 'volt:inter-plugin:';

export function emitInterPluginMessage<TPayload>(channel: string, payload: TPayload): void {
  window.dispatchEvent(new CustomEvent(`${CHANNEL_PREFIX}${channel}`, { detail: payload }));
}

export function onInterPluginMessage<TPayload>(
  channel: string,
  callback: (payload: TPayload) => void,
): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent<TPayload>).detail);
  };

  window.addEventListener(`${CHANNEL_PREFIX}${channel}`, handler);
  return () => {
    window.removeEventListener(`${CHANNEL_PREFIX}${channel}`, handler);
  };
}
