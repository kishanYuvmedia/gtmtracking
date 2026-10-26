import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface SuccessToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  message,
  isVisible,
  onClose,
  duration = 2500,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 bg-ink text-white rounded-xl shadow-lg">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold">{message}</span>
      </div>
    </div>
  );
};
