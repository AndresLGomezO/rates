import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Extra classes for the trigger when it has an error state. */
  errorClassName?: string;
  hasError?: boolean;
  'aria-label'?: string;
}

const CHEVRON_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E";

export function Select({
  id,
  value,
  onChange,
  options,
  disabled = false,
  required,
  className = '',
  errorClassName = '',
  hasError = false,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? '';

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const listHeight = Math.min(320, options.length * 44 + 16);
    const above = spaceBelow < listHeight && rect.top > listHeight;
    setPosition({
      top: above ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      above,
    });
  }, [options.length]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    // Run after the state flush so we measure the trigger
    requestAnimationFrame(updatePosition);
  }, [disabled, updatePosition]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  const select = useCallback(
    (opt: SelectOption) => {
      onChange(opt.value);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handle = (e: Event) => {
      const target = (e as { target: EventTarget | null }).target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      )
        return;
      closeDropdown();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, closeDropdown]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: Event) => {
      if ('key' in e && e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, closeDropdown]);

  // Reposition on resize when open
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open, updatePosition]);

  const triggerClasses = `flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-black/20 px-3.5 py-3.5 text-left text-white outline-none transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError
      ? `border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)] ${errorClassName}`
      : 'border-neutral-600/40 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
  }`;

  const dropdown =
    open &&
    position &&
    createPortal(
      <ul
        ref={listRef}
        role="listbox"
        aria-labelledby={id}
        className="modal-scrollbar fixed z-[10001] max-h-[min(320px,50vh)] overflow-y-auto rounded-lg border border-neutral-600/50 bg-[rgba(15,23,42,0.98)] py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        style={{
          top: position.above ? 'auto' : position.top,
          bottom: position.above ? `calc(100vh - ${position.top}px)` : 'auto',
          left: position.left,
          width: position.width,
          minWidth: position.width,
        }}
      >
        {options.map((opt) => (
          <li
            key={opt.value}
            role="option"
            aria-selected={opt.value === value}
            className={`cursor-pointer px-3.5 py-2.5 text-[0.95rem] text-white/95 transition-colors ${
              opt.value === value
                ? 'bg-primary-500/25 font-[650] text-white'
                : 'hover:bg-white/12'
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              select(opt);
            }}
          >
            {opt.label}
          </li>
        ))}
      </ul>,
      document.body
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-required={required}
        disabled={disabled}
        className={`${triggerClasses} ${className}`}
        onClick={openDropdown}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <span
          className="flex h-4 w-4 flex-shrink-0 opacity-80"
          style={{
            backgroundImage: `url("${CHEVRON_SVG}")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform 0.2s ease',
          }}
          aria-hidden
        />
      </button>
      {dropdown}
    </>
  );
}
