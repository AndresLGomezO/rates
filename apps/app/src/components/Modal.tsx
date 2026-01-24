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
      className="fixed inset-0 w-screen h-screen bg-black/60 backdrop-blur-[4px] flex items-center justify-center z-[9999] animate-fadeIn p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-[800px] max-h-[90vh] overflow-hidden glass-panel animate-slideUp md:max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="relative flex justify-between items-center pb-6 pt-8 px-8 border-b border-neutral-700/30 md:pb-4 md:pt-6 md:px-6 after:content-[''] after:absolute after:bottom-0 after:left-8 after:right-8 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/40 after:to-transparent md:after:left-6 md:after:right-6">
            <h2 className="m-0 text-[1.75rem] font-bold leading-none tracking-[-0.5px] bg-clip-text text-transparent bg-gradient-to-br from-white to-white/80 md:text-2xl">
              {title}
            </h2>
            <button
              className="flex items-center justify-center w-10 h-10 p-0 bg-white/10 backdrop-blur-[10px] border border-neutral-600/40 text-white text-[2rem] leading-none rounded-lg cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/20 hover:border-neutral-500/50 hover:scale-110 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-95"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-8 modal-scrollbar md:p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
