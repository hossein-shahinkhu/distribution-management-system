import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width = 'max-w-lg', saving = false }) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape — blocked while saving
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, saving]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={saving ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`
          animate-scaleIn w-full ${width}
          max-h-[92vh] overflow-y-auto
          rounded-t-2xl bg-white shadow-modal sm:rounded-2xl
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-white px-5 py-4">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-navy-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="بستن"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
