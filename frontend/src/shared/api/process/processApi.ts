import { process } from '../../../../wailsjs/go/models';
import { invokeWailsSafe } from '@shared/api/wailsWithError';
import type { StartProcessRequest } from './types';

const loadProcessHandler = () => import('../../../../wailsjs/go/wailshandler/ProcessHandler');

function toWailsRequest(request: StartProcessRequest): process.StartRequest {
  return process.StartRequest.createFrom({
    RunID: request.runId,
    VoltPath: request.voltPath,
    Command: request.command,
    Args: request.args ?? [],
    Stdin: request.stdin ?? '',
    StdoutMode: request.stdoutMode ?? 'raw',
    StderrMode: request.stderrMode ?? 'raw',
    StartFailedMessage: request.startFailedMessage ?? 'Failed to start process.',
    StreamFailedMessage: request.streamFailedMessage ?? 'Failed to stream process output.',
    RunFailedMessage: request.runFailedMessage ?? 'Process finished with an error.',
  });
}

export async function startProcess(request: StartProcessRequest): Promise<void> {
  return invokeWailsSafe(
    loadProcessHandler,
    (mod) => mod.Start(toWailsRequest(request)),
    `process.start:${request.command}`,
  );
}

export async function cancelProcess(runId: string): Promise<void> {
  return invokeWailsSafe(loadProcessHandler, (mod) => mod.Cancel(runId), `process.cancel:${runId}`);
}
