import { useSearchParams } from 'react-router-dom';
import type { AccountType, AccountStatus } from '@rates/firebase-client';
import './Filters.css';

const ACCOUNT_STATUSES: Array<{
  value: AccountStatus;
  label: string;
  icon: string;
}> = [
  { value: 'active', label: 'Active', icon: '🟢' },
  { value: 'paid_off', label: 'Paid Off', icon: '✅' },
  { value: 'closed', label: 'Closed', icon: '🔒' },
  { value: 'defaulted', label: 'Defaulted', icon: '⚠️' },
  { value: 'on_hold', label: 'On Hold', icon: '⏸️' },
];

const ACCOUNT_TYPES: Array<{
  value: AccountType;
  label: string;
  icon: string;
}> = [
  { value: 'loan', label: 'Loans', icon: '💰' },
  { value: 'credit_card', label: 'Credit Cards', icon: '💳' },
  { value: 'bill', label: 'Bills', icon: '📄' },
  { value: 'mortgage', label: 'Mortgages', icon: '🏠' },
  { value: 'personal_loan', label: 'Personal Loans', icon: '👤' },
  { value: 'auto_loan', label: 'Auto Loans', icon: '🚗' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const CURRENCIES = ['COP', 'USD', 'EUR', 'GBP'] as const;

interface FiltersProps {
  hideAccountType?: boolean; // For AccountsByType page where type is already filtered
  showDaysFilter?: boolean; // Show days ahead filter (for Dashboard)
}

export function Filters({
  hideAccountType = false,
  showDaysFilter = false,
}: FiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current filter values from URL
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

  const toggleStatus = (status: AccountStatus) => {
    const newStatuses = statusFilters.includes(status)
      ? statusFilters.filter((s) => s !== status)
      : [...statusFilters, status];

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (newStatuses.length > 0) {
        newParams.set('status', newStatuses.join(','));
      } else {
        newParams.delete('status');
      }
      return newParams;
    });
  };

  const toggleType = (type: AccountType) => {
    const newTypes = typeFilters.includes(type)
      ? typeFilters.filter((t) => t !== type)
      : [...typeFilters, type];

    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (newTypes.length > 0) {
        newParams.set('type', newTypes.join(','));
      } else {
        newParams.delete('type');
      }
      return newParams;
    });
  };

  const setCurrency = (currency: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (currency) {
        newParams.set('currency', currency);
      } else {
        newParams.delete('currency');
      }
      return newParams;
    });
  };

  const setDaysAhead = (days: number) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (days === 15) {
        newParams.delete('daysAhead');
      } else {
        newParams.set('daysAhead', days.toString());
      }
      return newParams;
    });
  };

  const clearAllFilters = () => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('status');
      newParams.delete('type');
      newParams.delete('currency');
      if (showDaysFilter) {
        newParams.delete('daysAhead');
      }
      return newParams;
    });
  };

  return (
    <div className="filters-content">
      {/* Status Filters */}
      <div className="filter-group">
        <label className="filter-group-label">Status</label>
        <div className="filter-options">
          {ACCOUNT_STATUSES.map((status) => (
            <button
              key={status.value}
              className={`filter-chip ${statusFilters.includes(status.value) ? 'active' : ''}`}
              onClick={() => toggleStatus(status.value)}
              type="button"
            >
              <span className="filter-chip-icon">{status.icon}</span>
              <span className="filter-chip-label">{status.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account Type Filters */}
      {!hideAccountType && (
        <div className="filter-group">
          <label className="filter-group-label">Account Type</label>
          <div className="filter-options">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type.value}
                className={`filter-chip ${typeFilters.includes(type.value) ? 'active' : ''}`}
                onClick={() => toggleType(type.value)}
                type="button"
              >
                <span className="filter-chip-icon">{type.icon}</span>
                <span className="filter-chip-label">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Currency Filter */}
      <div className="filter-group">
        <label className="filter-group-label">Currency</label>
        <div className="filter-options">
          <button
            className={`filter-chip ${currencyFilter === '' ? 'active' : ''}`}
            onClick={() => setCurrency('')}
            type="button"
          >
            <span className="filter-chip-label">All</span>
          </button>
          {CURRENCIES.map((currency) => (
            <button
              key={currency}
              className={`filter-chip ${currencyFilter === currency ? 'active' : ''}`}
              onClick={() => setCurrency(currency)}
              type="button"
            >
              <span className="filter-chip-label">{currency}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Days Ahead Filter (for Dashboard) */}
      {showDaysFilter && (
        <div className="filter-group">
          <label className="filter-group-label">Days Ahead</label>
          <div className="filter-options">
            {[7, 15, 30, 60, 90].map((days) => (
              <button
                key={days}
                className={`filter-chip ${daysAhead === days ? 'active' : ''}`}
                onClick={() => setDaysAhead(days)}
                type="button"
              >
                <span className="filter-chip-label">{days} days</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <button
          className="filters-clear"
          onClick={clearAllFilters}
          type="button"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
