import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white/90 dark:bg-[#0d1225]/90 backdrop-blur-2xl rounded-3xl shadow-2xl dark:shadow-black/60 border border-gray-200/60 dark:border-gray-800/60 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${
            variant === 'danger'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
              : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100'
          }`}>
            <AlertTriangle size={24} strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
            {title || 'Confirm'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-xs">
            {message}
          </p>
          <div className="flex gap-2.5 w-full">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              {cancelLabel || 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-colors ${
                variant === 'danger'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
              }`}
            >
              {confirmLabel || 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
