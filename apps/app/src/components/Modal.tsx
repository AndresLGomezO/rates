import { type PropsWithChildren, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
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
        {title && (
          <div className="relative flex items-center justify-between border-b border-neutral-700/30 px-8 pb-6 pt-8 after:absolute after:bottom-0 after:left-8 after:right-8 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/40 after:to-transparent after:content-[''] md:px-6 md:pb-4 md:pt-6 md:after:left-6 md:after:right-6">
            <h2 className="m-0 bg-gradient-to-br from-white to-white/80 bg-clip-text text-[1.75rem] font-bold leading-none tracking-[-0.5px] text-transparent md:text-2xl">
              {title}
            </h2>
            <button
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/10 p-0 text-[2rem] leading-none text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-neutral-500/50 hover:bg-white/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-95"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="modal-scrollbar flex-1 overflow-y-auto p-8 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
