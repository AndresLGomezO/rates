import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Filters } from './Filters';
import { Modal } from './Modal';

export function SearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialSearch = searchParams.get('search') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingFromUrlRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hide account type filter on AccountsByType page (type is already filtered by route)
  const hideAccountType = location.pathname.startsWith('/accounts/');

  // Show days filter on Dashboard page
  const showDaysFilter =
    location.pathname === '/' || location.pathname === '/dashboard';

  // Check if there are active filters
  const statusFilters =
    searchParams.get('status')?.split(',').filter(Boolean) ?? [];
  const typeFilters =
    searchParams.get('type')?.split(',').filter(Boolean) ?? [];
  const currencyFilter = searchParams.get('currency') ?? '';
  const daysAhead = parseInt(searchParams.get('daysAhead') ?? '15', 10);
  const hasActiveFilters =
    statusFilters.length > 0 ||
    typeFilters.length > 0 ||
    currencyFilter !== '' ||
    (showDaysFilter && daysAhead !== 15);
  const activeFiltersCount =
    statusFilters.length +
    typeFilters.length +
    (currencyFilter ? 1 : 0) +
    (showDaysFilter && daysAhead !== 15 ? 1 : 0);

  // Update URL when search query changes (with debounce)
  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't update URL if we're syncing from URL
    if (isUpdatingFromUrlRef.current) {
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set('search', searchQuery.trim());
          return newParams;
        });
      } else {
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('search');
          return newParams;
        });
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, setSearchParams]);

  // Sync with URL changes (e.g., browser back/forward) - only when URL changes externally
  useEffect(() => {
    const urlSearch = searchParams.get('search') ?? '';

    // Only update if URL changed and it's different from current state
    // This handles browser back/forward navigation
    if (urlSearch !== searchQuery) {
      isUpdatingFromUrlRef.current = true;
      setSearchQuery(urlSearch);
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromUrlRef.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      // Find the scrollable container (main-content-scrollable)
      const scrollableContainer = document.querySelector(
        '.main-content-scrollable'
      );
      if (scrollableContainer) {
        const scrollTop = scrollableContainer.scrollTop;
        setIsScrolled(scrollTop > 50); // Trigger compact mode after 50px scroll
      }
    };

    const scrollableContainer = document.querySelector(
      '.main-content-scrollable'
    );
    if (scrollableContainer) {
      scrollableContainer.addEventListener('scroll', handleScroll, {
        passive: true,
      });
      // Check initial scroll position
      handleScroll();

      return () => {
        scrollableContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  const handleClear = () => {
    setSearchQuery('');
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('search');
      return newParams;
    });
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`sticky top-0 z-searchbar pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isScrolled
            ? 'px-10 py-3 bg-white/8 backdrop-blur-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] md:px-6 md:py-2.5 xs:px-4 xs:py-2'
            : 'px-10 py-6 bg-white/5 backdrop-blur-[10px] border-b border-neutral-700/30 md:px-6 md:py-4 xs:px-4 xs:py-3.5'
        } relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/30 after:to-transparent after:pointer-events-none`}
      >
        <div
          className={`group relative flex items-center w-full mx-auto pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] glass-panel border-neutral-600/40 shadow-[0_4px_16px_0_rgba(10,14,26,0.4),inset_0_1px_0_0_rgba(255,255,255,0.15)] focus-within:border-primary-500/60 focus-within:shadow-[0_6px_24px_0_rgba(10,14,26,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)] focus-within:-translate-y-0.5 ${
            isScrolled
              ? 'gap-3 max-w-[600px] px-4 py-2.5 rounded-xl shadow-[0_2px_8px_0_rgba(10,14,26,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)] focus-within:shadow-[0_4px_12px_0_rgba(10,14,26,0.4),inset_0_1px_0_0_rgba(255,255,255,0.18)] focus-within:-translate-y-[1px] md:max-w-full md:px-3.5 md:py-2'
              : 'gap-3 max-w-[800px] px-5 py-3.5 rounded-2xl md:px-4 md:py-3 xs:px-3.5 xs:py-2.5 xs:rounded-xl'
          }`}
        >
          <span
            className={`flex-shrink-0 transition-all duration-300 ease-out opacity-70 ${
              isScrolled
                ? 'text-base md:text-base xs:text-[0.9rem]'
                : 'text-xl md:text-base xs:text-base'
            } group-focus-within:opacity-100`}
          >
            🔍
          </span>
          <input
            type="text"
            className={`relative flex-1 w-full min-w-0 p-0 bg-transparent border-0 outline-none pointer-events-auto z-[2] text-white font-medium transition-[font-size] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/50 placeholder:font-normal ${
              isScrolled
                ? 'text-[0.9rem] md:text-[0.85rem] xs:text-[0.8rem]'
                : 'text-base md:text-[0.9rem] xs:text-[0.875rem]'
            }`}
            placeholder={
              isScrolled
                ? 'Search...'
                : 'Search accounts by name, number, or description...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search accounts"
          />
          {searchQuery && (
            <button
              className={`flex items-center justify-center flex-shrink-0 p-0 leading-none text-white font-semibold cursor-pointer border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white/20 border-neutral-600/50 rounded-full hover:bg-white/30 hover:border-neutral-500/60 hover:scale-110 active:scale-95 ${
                isScrolled
                  ? 'w-5 h-5 text-xs xs:w-[18px] xs:h-[18px] xs:text-[0.7rem]'
                  : 'w-6 h-6 text-sm'
              }`}
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            className={`relative flex items-center justify-center flex-shrink-0 p-0 text-white cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isScrolled ? 'w-9 h-9 rounded-[10px]' : 'w-10 h-10 rounded-xl'
            } ${
              hasActiveFilters
                ? 'bg-gradient-to-br from-[rgba(30,64,175,0.3)] to-[rgba(51,65,85,0.3)] border border-[rgba(30,64,175,0.5)] shadow-[0_2px_8px_rgba(30,64,175,0.3)]'
                : 'bg-white/15 border border-neutral-600/40'
            } hover:bg-white/25 hover:border-neutral-500/50 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:translate-y-0`}
            onClick={() => setIsFiltersModalOpen(true)}
            aria-label="Open filters"
            title="Filters"
          >
            <span
              className={`flex items-center justify-center ${
                isScrolled ? 'text-base' : 'text-[1.1rem]'
              }`}
            >
              ⚙️
            </span>
            {hasActiveFilters && (
              <span
                className={`absolute text-white font-bold text-center min-w-[18px] px-[0.4rem] py-[0.2rem] rounded-[10px] bg-gradient-to-br from-[#1e40af] to-[#334155] shadow-[0_2px_6px_rgba(30,64,175,0.4)] border-2 border-neutral-600/40 ${
                  isScrolled
                    ? 'top-[-4px] right-[-4px] text-[0.6rem] px-[0.35rem] py-[0.15rem] min-w-4'
                    : 'top-[-4px] right-[-4px] text-[0.65rem]'
                }`}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <Modal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        title="Filters"
      >
        <Filters
          hideAccountType={hideAccountType}
          showDaysFilter={showDaysFilter}
        />
      </Modal>
    </>
  );
}
