import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Filters } from './Filters';
import { Modal } from './Modal';

interface SearchBarProps {
  showMobileCompact?: boolean;
}

export function SearchBar({ showMobileCompact = false }: SearchBarProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialSearch = searchParams.get('search') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingFromUrlRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleMobileExpand = () => {
    setIsMobileExpanded(true);
    // Focus input after expansion animation
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleMobileCollapse = () => {
    setIsMobileExpanded(false);
  };

  // Close mobile search when clicking outside (only on mobile)
  useEffect(() => {
    if (!isMobileExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        handleMobileCollapse();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileExpanded]);

  return (
    <>
      {/* Mobile compact search button - only render if showMobileCompact is true */}
      {showMobileCompact && (
        <div className="md:hidden">
          {!isMobileExpanded ? (
            <button
              onClick={handleMobileExpand}
              className="relative flex h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/10 p-2.5 text-xl text-white shadow-[0_4px_12px_rgba(10,14,26,0.3)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-neutral-500/50 hover:bg-white/20 hover:shadow-[0_6px_20px_rgba(10,14,26,0.4)] active:scale-95"
              aria-label="Open search"
            >
              <span className="flex items-center justify-center">🔍</span>
              {searchQuery && (
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white/20 bg-primary-500" />
              )}
            </button>
          ) : null}
        </div>
      )}

      {/* Mobile expanded overlay - always available on mobile */}
      {isMobileExpanded && (
        <div className="md:hidden">
          <div
            ref={containerRef}
            className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-md transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            onClick={handleMobileCollapse}
          >
            <div
              className="absolute left-0 right-0 top-0 border-b border-neutral-700/40 bg-[rgba(15,23,42,0.95)] px-4 pb-3 pt-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-panel group pointer-events-auto relative mx-auto flex w-full items-center gap-3 rounded-lg border-neutral-600/40 px-4 py-2.5 shadow-[0_4px_16px_0_rgba(10,14,26,0.4),inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus-within:border-primary-500/60 focus-within:shadow-[0_6px_24px_0_rgba(10,14,26,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)]">
                <span className="flex-shrink-0 text-base opacity-70 group-focus-within:opacity-100">
                  🔍
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="pointer-events-auto relative z-[2] w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[0.875rem] font-medium text-white outline-none placeholder:font-normal placeholder:text-white/50"
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search accounts"
                />
                {searchQuery && (
                  <button
                    className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-600/50 bg-white/20 p-0 text-xs font-semibold leading-none text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-neutral-500/60 hover:bg-white/30 active:scale-95"
                    onClick={handleClear}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button
                  className={`relative flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-md p-0 text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    hasActiveFilters
                      ? 'border border-[rgba(30,64,175,0.5)] bg-gradient-to-br from-[rgba(30,64,175,0.3)] to-[rgba(51,65,85,0.3)] shadow-[0_2px_8px_rgba(30,64,175,0.3)]'
                      : 'border border-neutral-600/40 bg-white/15'
                  } hover:-translate-y-0.5 hover:border-neutral-500/50 hover:bg-white/25 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:translate-y-0`}
                  onClick={() => {
                    setIsFiltersModalOpen(true);
                    handleMobileCollapse();
                  }}
                  aria-label="Open filters"
                  title="Filters"
                >
                  <span className="flex items-center justify-center text-base">
                    ⚙️
                  </span>
                  {hasActiveFilters && (
                    <span className="absolute right-[-4px] top-[-4px] min-w-[18px] rounded-md border-2 border-neutral-600/40 bg-gradient-to-br from-[#1e40af] to-[#334155] px-[0.35rem] py-[0.15rem] text-center text-[0.6rem] font-bold text-white shadow-[0_2px_6px_rgba(30,64,175,0.4)]">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop search bar */}
      <div
        className={`pointer-events-auto sticky top-0 z-searchbar hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:block ${
          isScrolled
            ? 'bg-white/8 px-10 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.1)] backdrop-blur-[15px] md:px-6 md:py-2.5'
            : 'border-b border-neutral-700/30 bg-white/5 px-10 py-6 backdrop-blur-[10px] md:px-6 md:py-4'
        } relative after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/30 after:to-transparent after:content-['']`}
      >
        <div
          className={`glass-panel group pointer-events-auto relative mx-auto flex w-full items-center border-neutral-600/40 shadow-[0_4px_16px_0_rgba(10,14,26,0.4),inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus-within:-translate-y-0.5 focus-within:border-primary-500/60 focus-within:shadow-[0_6px_24px_0_rgba(10,14,26,0.5),inset_0_1px_0_0_rgba(255,255,255,0.2)] ${
            isScrolled
              ? 'max-w-[600px] gap-3 rounded-lg px-4 py-2.5 shadow-[0_2px_8px_0_rgba(10,14,26,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)] focus-within:-translate-y-[1px] focus-within:shadow-[0_4px_12px_0_rgba(10,14,26,0.4),inset_0_1px_0_0_rgba(255,255,255,0.18)] md:max-w-full md:px-3.5 md:py-2'
              : 'max-w-[800px] gap-3 rounded-xl px-5 py-3.5 md:px-4 md:py-3'
          }`}
        >
          <span
            className={`flex-shrink-0 opacity-70 transition-all duration-300 ease-out ${
              isScrolled ? 'text-base md:text-base' : 'text-xl md:text-base'
            } group-focus-within:opacity-100`}
          >
            🔍
          </span>
          <input
            type="text"
            className={`pointer-events-auto relative z-[2] w-full min-w-0 flex-1 border-0 bg-transparent p-0 font-medium text-white outline-none transition-[font-size] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:font-normal placeholder:text-white/50 ${
              isScrolled
                ? 'text-[0.9rem] md:text-[0.85rem]'
                : 'text-base md:text-[0.9rem]'
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
              className={`flex flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-neutral-600/50 bg-white/20 p-0 font-semibold leading-none text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110 hover:border-neutral-500/60 hover:bg-white/30 active:scale-95 ${
                isScrolled ? 'h-5 w-5 text-xs' : 'h-6 w-6 text-sm'
              }`}
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            className={`relative flex flex-shrink-0 cursor-pointer items-center justify-center p-0 text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isScrolled ? 'h-9 w-9 rounded-md' : 'h-10 w-10 rounded-lg'
            } ${
              hasActiveFilters
                ? 'border border-[rgba(30,64,175,0.5)] bg-gradient-to-br from-[rgba(30,64,175,0.3)] to-[rgba(51,65,85,0.3)] shadow-[0_2px_8px_rgba(30,64,175,0.3)]'
                : 'border border-neutral-600/40 bg-white/15'
            } hover:-translate-y-0.5 hover:border-neutral-500/50 hover:bg-white/25 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:translate-y-0`}
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
                className={`absolute min-w-[18px] rounded-md border-2 border-neutral-600/40 bg-gradient-to-br from-[#1e40af] to-[#334155] px-[0.4rem] py-[0.2rem] text-center font-bold text-white shadow-[0_2px_6px_rgba(30,64,175,0.4)] ${
                  isScrolled
                    ? 'right-[-4px] top-[-4px] min-w-4 px-[0.35rem] py-[0.15rem] text-[0.6rem]'
                    : 'right-[-4px] top-[-4px] text-[0.65rem]'
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
