import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizes = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-6xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, description, children, size = 'md',
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full ${sizes[size]} bg-white rounded-neo
                       animate-scale-in max-h-[92vh] flex flex-col
                       border-3 border-gray-900`}
           style={{ boxShadow: '6px 6px 0px 0px #1a1a1a' }}>
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between px-6 py-5 border-b-3 border-gray-900 flex-shrink-0 bg-neo-cream">
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {description && <p className="text-xs text-gray-500 mt-0.5 font-medium">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-neo hover:bg-neo-red/20 text-gray-600 hover:text-neo-red transition-colors ml-4 flex-shrink-0 border-2 border-transparent hover:border-gray-900"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
