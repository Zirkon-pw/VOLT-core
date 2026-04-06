export interface StartProcessRequest {
  runId: string;
  voltPath: string;
  command: string;
  args?: string[];
  stdin?: string;
  stdoutMode?: 'raw' | 'lines';
  stderrMode?: 'raw' | 'lines';
  startFailedMessage?: string;
  streamFailedMessage?: string;
  runFailedMessage?: string;
}
