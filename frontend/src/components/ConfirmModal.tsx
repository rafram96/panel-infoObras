"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when modal opens
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fadeIn 0.15s ease-out" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDanger
                  ? "bg-error-container/30"
                  : "bg-primary/10"
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${
                  isDanger ? "text-error" : "text-primary"
                }`}
              >
                {isDanger ? "warning" : "help"}
              </span>
            </div>
            <h3 className="text-base font-bold text-on-surface">{title}</h3>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed pl-[52px]">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 mt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold tracking-tight text-on-surface hover:bg-surface-container-high transition-all rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-extrabold uppercase tracking-wider rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDanger
                ? "bg-error text-white shadow-[0_2px_8px_0_rgba(186,26,26,0.3)]"
                : "primary-gradient text-white shadow-[0_2px_8px_0_rgba(2,36,72,0.3)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
