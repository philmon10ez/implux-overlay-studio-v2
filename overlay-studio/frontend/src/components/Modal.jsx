import { useEffect } from 'react';

/**
 * Generic dialog — click backdrop or Escape to close.
 */
export default function Modal({ open, title, onClose, children, size = 'lg' }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && open && onClose?.();
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
  }[size] || 'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxW} max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[calc(90vh-4.5rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
