import type {
  FinancialAccount,
  AccountType,
  AccountStatus,
} from '@rates/firebase-client';

export interface FilterOptions {
  search?: string;
  status?: AccountStatus[];
  type?: AccountType[];
  currency?: string;
}

/**
 * Filters accounts based on a search query.
 * Searches in account name, account number, and description.
 */
export function filterAccountsBySearch(
  accounts: FinancialAccount[],
  searchQuery: string
): FinancialAccount[] {
  if (!searchQuery.trim()) {
    return accounts;
  }

  const query = searchQuery.toLowerCase().trim();

  return accounts.filter((account) => {
    const name = account.accountName.toLowerCase();
    const number = account.accountNumber.toLowerCase();
    const description = (account.accountDescription || '').toLowerCase();

    return (
      name.includes(query) ||
      number.includes(query) ||
      description.includes(query)
    );
  });
}

/**
 * Filters accounts based on multiple filter criteria.
 */
export function filterAccounts(
  accounts: FinancialAccount[],
  filters: FilterOptions
): FinancialAccount[] {
  let filtered = accounts;

  // Apply search filter
  if (filters.search?.trim()) {
    filtered = filterAccountsBySearch(filtered, filters.search);
  }

  // Apply status filter
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter((account) =>
      filters.status!.includes(account.status)
    );
  }

  // Apply type filter
  if (filters.type && filters.type.length > 0) {
    filtered = filtered.filter((account) =>
      filters.type!.includes(account.accountType)
    );
  }

  // Apply currency filter
  if (filters.currency) {
    filtered = filtered.filter(
      (account) => account.totalAmountRemaining.currency === filters.currency
    );
  }

  return filtered;
}
