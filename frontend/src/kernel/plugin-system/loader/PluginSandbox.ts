export function runPluginInSandbox(source: string, api: unknown): void {
  const pluginFactory = new Function('api', source);
  pluginFactory(api);
}
