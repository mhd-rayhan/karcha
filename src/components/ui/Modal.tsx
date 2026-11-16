import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ComponentChildren;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss overlay"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in border-none cursor-default w-full h-full"
        onClick={onClose}
      />

      {/* Dialog content */}
      <div
        className={`relative w-full ${maxWidth} rounded-xl border border-border bg-card p-6 shadow-2xl transition-all z-10`}
      >
        <div className="flex items-start justify-between pb-3">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
