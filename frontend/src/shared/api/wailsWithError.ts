import { waitForWailsBridge } from './wails';

export class WailsApiError extends Error {
  readonly operation: string;
  readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`[${operation}] ${message}`);
    this.name = 'WailsApiError';
    this.operation = operation;
    this.cause = cause;
  }
}

export async function invokeWailsSafe<TModule, TResult>(
  loadModule: () => Promise<TModule>,
  invoke: (module: TModule) => TResult | Promise<TResult>,
  operation: string,
): Promise<TResult> {
  try {
    await waitForWailsBridge();
    const module = await loadModule();
    return await invoke(module);
  } catch (error) {
    throw new WailsApiError(operation, error);
  }
}
