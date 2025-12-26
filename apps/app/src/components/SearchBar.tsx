import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Filters } from './Filters';
import { Modal } from './Modal';
import './SearchBar.css';

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

  // Check if there are active filters
  const statusFilters =
    searchParams.get('status')?.split(',').filter(Boolean) ?? [];
  const typeFilters =
    searchParams.get('type')?.split(',').filter(Boolean) ?? [];
  const currencyFilter = searchParams.get('currency') ?? '';
  const hasActiveFilters =
    statusFilters.length > 0 || typeFilters.length > 0 || currencyFilter !== '';
  const activeFiltersCount =
    statusFilters.length + typeFilters.length + (currencyFilter ? 1 : 0);

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
        className={`search-bar-container ${isScrolled ? 'scrolled' : ''}`}
      >
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
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
              className="search-clear"
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            className={`search-filters-btn ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setIsFiltersModalOpen(true)}
            aria-label="Open filters"
            title="Filters"
          >
            <span className="search-filters-icon">⚙️</span>
            {hasActiveFilters && (
              <span className="search-filters-badge">{activeFiltersCount}</span>
            )}
          </button>
        </div>
      </div>
      <Modal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        title="Filters"
      >
        <Filters hideAccountType={hideAccountType} />
      </Modal>
    </>
  );
}
