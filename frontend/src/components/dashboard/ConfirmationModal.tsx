import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl w-[400px] mx-4 overflow-hidden animate-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg transition-colors"
        >
          <X className="w-4 h-4 text-muted" />
        </button>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            {variant === 'danger' && (
              <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
            )}
            {variant === 'warning' && (
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
            )}
            {variant === 'default' && (
              <div className="w-12 h-12 rounded-xl bg-bg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-muted" />
              </div>
            )}
            <div>
              <h3 className="text-[15px] font-bold text-ink">{title}</h3>
              <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-[13px] font-semibold text-muted bg-bg border border-border rounded-xl hover:bg-border/30 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-colors ${
              variant === 'danger'
                ? 'bg-danger text-white hover:bg-danger/90'
                : variant === 'warning'
                ? 'bg-warning text-white hover:bg-warning/90'
                : 'bg-ink text-white hover:bg-ink-soft'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
