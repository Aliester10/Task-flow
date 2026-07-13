import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Hapus', variant = 'danger', isLoading,
}) => {
  const isDanger = variant === 'danger';
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <div className={`w-12 h-12 rounded-neo border-3 border-gray-900 flex items-center justify-center mb-4
          ${isDanger ? 'bg-neo-red' : 'bg-neo-yellow'}`}
          style={{ boxShadow: '3px 3px 0px 0px #1a1a1a' }}
        >
          {isDanger
            ? <Trash2 className="w-5 h-5 text-white" />
            : <AlertTriangle className="w-5 h-5 text-gray-900" />}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6 font-medium">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-md btn-secondary flex-1" disabled={isLoading}>
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`btn-md flex-1 flex items-center justify-center gap-2
              ${isDanger ? 'btn-danger' : 'bg-neo-yellow hover:bg-yellow-300 text-gray-900 btn'}`}
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
