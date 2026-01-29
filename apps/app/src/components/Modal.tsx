import { type PropsWithChildren, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Rendered outside the scrollable body, always visible at the bottom. */
  footer?: React.ReactNode;
  /** Use a smaller header (padding and title font). */
  compactHeader?: boolean;
  /** Rendered in the header below the title row, always visible. */
  headerSupplement?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  footer,
  compactHeader,
  headerSupplement,
  children,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex h-screen w-screen animate-fadeIn items-center justify-center bg-black/60 p-4 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="glass-panel relative flex max-h-[90vh] w-full max-w-[800px] animate-slideUp flex-col overflow-hidden md:max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {(title ?? headerSupplement) && (
          <div
            className={`relative flex flex-col border-b border-neutral-700/30 after:absolute after:bottom-0 after:left-8 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/40 after:to-transparent after:content-[''] md:after:left-6 md:after:right-6 ${
              compactHeader
                ? 'px-6 pb-3.5 pt-4 after:left-6 after:right-6 md:px-5 md:pb-3 md:pt-3.5 md:after:left-5 md:after:right-5'
                : 'px-8 pb-6 pt-8 after:right-8 md:px-6 md:pb-4 md:pt-6 md:after:right-6'
            }`}
          >
            {title && (
              <div className="flex items-center justify-between">
                <h2
                  className={`m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text font-bold leading-none tracking-[-0.5px] text-transparent ${
                    compactHeader
                      ? 'text-[1.15rem] md:text-[1.25rem]'
                      : 'text-[1.75rem] md:text-2xl'
                  }`}
                >
                  {title}
                </h2>
                <button
                  className={`flex cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/10 p-0 leading-none text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-neutral-500/50 hover:bg-white/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-95 ${
                    compactHeader
                      ? 'h-8 w-8 text-[1.25rem]'
                      : 'h-10 w-10 text-[2rem]'
                  }`}
                  onClick={onClose}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            )}
            {headerSupplement != null && (
              <div className={title ? 'mt-3' : ''}>{headerSupplement}</div>
            )}
          </div>
        )}
        <div className="modal-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2 md:p-6">
          {children}
        </div>
        {footer != null && (
          <div className="flex-shrink-0 border-t border-neutral-700/30 px-8 pb-8 pt-4 md:px-6 md:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
