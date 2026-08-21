'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  showCancel = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest dark:bg-[#181a1f] rounded-2xl shadow-2xl border border-surface-container dark:border-gray-800 w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDanger
                ? 'bg-error-container/20 text-error dark:text-red-400 dark:bg-red-950/30'
                : 'bg-primary/10 text-primary dark:bg-primary/20'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-on-surface dark:text-gray-100">
              {title}
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-gray-400 leading-relaxed">
              {message}
            </p>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white p-1 rounded-lg hover:bg-surface-container dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {showCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs md:text-sm font-semibold text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl shadow-xs transition-colors ${
              isDanger
                ? 'bg-error text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
