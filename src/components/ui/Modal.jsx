import { useEffect } from 'react';

const Modal = ({ open, title, description, children, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h3>
              {description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
