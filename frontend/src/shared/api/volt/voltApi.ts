import { Volt } from './types';
import { invokeWailsSafe } from '@shared/api/wailsWithError';

const loadVoltHandler = () => import('../../../../wailsjs/go/wailshandler/VoltHandler');

export async function listVolts(): Promise<Volt[]> {
  return invokeWailsSafe(loadVoltHandler, (mod) => mod.ListVolts(), 'listVolts');
}

export async function createVolt(name: string, path: string): Promise<Volt> {
  return invokeWailsSafe(loadVoltHandler, (mod) => mod.CreateVolt(name, path), 'createVolt');
}

export async function createVoltInParent(name: string, parentPath: string, directoryName: string): Promise<Volt> {
  return invokeWailsSafe(
    loadVoltHandler,
    (mod) => mod.CreateVoltInParent(name, parentPath, directoryName),
    'createVoltInParent',
  );
}

export async function deleteVolt(id: string): Promise<void> {
  return invokeWailsSafe(loadVoltHandler, (mod) => mod.DeleteVolt(id), 'deleteVolt');
}

export async function selectDirectory(): Promise<string> {
  return invokeWailsSafe(loadVoltHandler, (mod) => mod.SelectDirectory(), 'selectDirectory');
}
