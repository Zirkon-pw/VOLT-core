import type { SpinnerProps } from '../model/types';
import { SpinnerView } from '../view/SpinnerView';

export function Spinner(props: SpinnerProps) {
  return <SpinnerView {...props} />;
}
