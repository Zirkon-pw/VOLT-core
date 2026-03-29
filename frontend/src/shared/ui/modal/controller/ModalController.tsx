import { ModalProps } from '../model/types';
import { ModalView } from '../view/ModalView';

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <ModalView isOpen={isOpen} onClose={onClose} title={title}>
      {children}
    </ModalView>
  );
}
