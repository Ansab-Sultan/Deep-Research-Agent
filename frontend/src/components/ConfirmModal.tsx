"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "info";
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  type = "info",
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm glass-panel bg-[var(--surface-paper)] p-8 rounded-[40px] shadow-2xl pointer-events-auto border border-[var(--border-subtle)]"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 ${
                  type === "danger" ? "bg-[var(--error)]/10 text-[var(--error)]" : "bg-[var(--accent)]/10 text-[var(--accent)]"
                }`}>
                  <AlertCircle className="h-8 w-8" />
                </div>
                
                <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2 tracking-tight">
                  {title}
                </h3>
                
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8 opacity-70">
                  {message}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={onCancel}
                    className="flex-1 px-6 py-3 rounded-2xl border border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] transition-all"
                  >
                    {cancelLabel}
                  </button>
                   <button
                    onClick={onConfirm}
                    className={`flex-1 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all ${
                      type === "danger" 
                        ? "bg-[var(--error)] text-white shadow-[0_8px_20px_-4px_var(--error)] hover:bg-[var(--error-dark)]" 
                        : "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_8px_20px_-4px_var(--accent)] hover:bg-[var(--accent-dark)]"
                    }`}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
