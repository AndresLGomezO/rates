import { useSearchParams } from 'react-router-dom';
import type { AccountType, AccountStatus } from '@rates/firebase-client';

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
    <div className="overflow-y-auto modal-scrollbar md:max-h-[60vh] xs:max-h-[50vh]">
      {/* Status Filters */}
      <div className="mb-8 last:mb-4 md:mb-6 xs:mb-5">
        <label className="block text-xs font-bold uppercase tracking-wide text-white/70 mb-3">
          Status
        </label>
        <div className="flex flex-wrap gap-2 md:gap-[0.4rem] xs:gap-[0.35rem]">
          {ACCOUNT_STATUSES.map((status) => (
            <button
              key={status.value}
              className={`flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[20px] text-[0.85rem] font-medium md:px-[0.875rem] md:py-[0.45rem] md:text-[0.8rem] xs:px-3 xs:py-[0.4rem] xs:text-xs ${
                statusFilters.includes(status.value)
                  ? 'px-4 py-2 text-white bg-gradient-to-br from-[rgba(102,126,234,0.3)] to-[rgba(118,75,162,0.3)] border border-[rgba(102,126,234,0.5)] shadow-[0_2px_8px_rgba(102,126,234,0.2)] hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:from-[rgba(102,126,234,0.4)] hover:to-[rgba(118,75,162,0.4)]'
                  : 'px-4 py-2 text-white/90 bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
              }`}
              onClick={() => toggleStatus(status.value)}
              type="button"
            >
              <span className="flex items-center text-[0.9rem] xs:text-xs">
                {status.icon}
              </span>
              <span className="flex items-center">{status.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account Type Filters */}
      {!hideAccountType && (
        <div className="mb-8 last:mb-4 md:mb-6 xs:mb-5">
          <label className="block text-xs font-bold uppercase tracking-wide text-white/70 mb-3">
            Account Type
          </label>
          <div className="flex flex-wrap gap-2 md:gap-[0.4rem] xs:gap-[0.35rem]">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type.value}
                className={`flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[20px] text-[0.85rem] font-medium md:px-[0.875rem] md:py-[0.45rem] md:text-[0.8rem] xs:px-3 xs:py-[0.4rem] xs:text-xs ${
                  typeFilters.includes(type.value)
                    ? 'px-4 py-2 text-white bg-gradient-to-br from-[rgba(102,126,234,0.3)] to-[rgba(118,75,162,0.3)] border border-[rgba(102,126,234,0.5)] shadow-[0_2px_8px_rgba(102,126,234,0.2)] hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:from-[rgba(102,126,234,0.4)] hover:to-[rgba(118,75,162,0.4)]'
                    : 'px-4 py-2 text-white/90 bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                }`}
                onClick={() => toggleType(type.value)}
                type="button"
              >
                <span className="flex items-center text-[0.9rem] xs:text-xs">
                  {type.icon}
                </span>
                <span className="flex items-center">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Currency Filter */}
      <div className="mb-8 last:mb-4 md:mb-6 xs:mb-5">
        <label className="block text-xs font-bold uppercase tracking-wide text-white/70 mb-3">
          Currency
        </label>
        <div className="flex flex-wrap gap-2 md:gap-[0.4rem] xs:gap-[0.35rem]">
          <button
            className={`flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[20px] text-[0.85rem] font-medium md:px-[0.875rem] md:py-[0.45rem] md:text-[0.8rem] xs:px-3 xs:py-[0.4rem] xs:text-xs ${
              currencyFilter === ''
                ? 'px-4 py-2 text-white bg-gradient-to-br from-[rgba(102,126,234,0.3)] to-[rgba(118,75,162,0.3)] border border-[rgba(102,126,234,0.5)] shadow-[0_2px_8px_rgba(102,126,234,0.2)] hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:from-[rgba(102,126,234,0.4)] hover:to-[rgba(118,75,162,0.4)]'
                : 'px-4 py-2 text-white/90 bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
            }`}
            onClick={() => setCurrency('')}
            type="button"
          >
            <span className="flex items-center">All</span>
          </button>
          {CURRENCIES.map((currency) => (
            <button
              key={currency}
              className={`flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[20px] text-[0.85rem] font-medium md:px-[0.875rem] md:py-[0.45rem] md:text-[0.8rem] xs:px-3 xs:py-[0.4rem] xs:text-xs ${
                currencyFilter === currency
                  ? 'px-4 py-2 text-white bg-gradient-to-br from-[rgba(102,126,234,0.3)] to-[rgba(118,75,162,0.3)] border border-[rgba(102,126,234,0.5)] shadow-[0_2px_8px_rgba(102,126,234,0.2)] hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:from-[rgba(102,126,234,0.4)] hover:to-[rgba(118,75,162,0.4)]'
                  : 'px-4 py-2 text-white/90 bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
              }`}
              onClick={() => setCurrency(currency)}
              type="button"
            >
              <span className="flex items-center">{currency}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Days Ahead Filter (for Dashboard) */}
      {showDaysFilter && (
        <div className="mb-8 last:mb-4 md:mb-6 xs:mb-5">
          <label className="block text-xs font-bold uppercase tracking-wide text-white/70 mb-3">
            Days Ahead
          </label>
          <div className="flex flex-wrap gap-2 md:gap-[0.4rem] xs:gap-[0.35rem]">
            {[7, 15, 30, 60, 90].map((days) => (
              <button
                key={days}
                className={`flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[20px] text-[0.85rem] font-medium md:px-[0.875rem] md:py-[0.45rem] md:text-[0.8rem] xs:px-3 xs:py-[0.4rem] xs:text-xs ${
                  daysAhead === days
                    ? 'px-4 py-2 text-white bg-gradient-to-br from-[rgba(102,126,234,0.3)] to-[rgba(118,75,162,0.3)] border border-[rgba(102,126,234,0.5)] shadow-[0_2px_8px_rgba(102,126,234,0.2)] hover:shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:from-[rgba(102,126,234,0.4)] hover:to-[rgba(118,75,162,0.4)]'
                    : 'px-4 py-2 text-white/90 bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                }`}
                onClick={() => setDaysAhead(days)}
                type="button"
              >
                <span className="flex items-center">{days} days</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <button
          className="block w-full mt-6 px-6 py-3.5 text-[0.9rem] font-semibold cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-xl bg-danger-500/20 border border-danger-500/30 text-danger-500 hover:bg-danger-500/30 hover:border-danger-500/40 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
          onClick={clearAllFilters}
          type="button"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
