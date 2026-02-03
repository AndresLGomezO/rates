import {
  ExtractedEntities,
  ResolvedFilters,
  UserVocabulary,
  AccountReference,
  CategoryReference,
  TimeframeFilter,
  DateRange,
  RelativePeriod,
} from '../types/chat.types.js';

export class EntityResolutionService {
  /**
   * Resolve extracted entity names to actual IDs/filters
   * This is a deterministic matching step - no LLM
   */
  resolveEntities(
    extracted: ExtractedEntities,
    vocabulary: UserVocabulary
  ): ResolvedFilters {
    const resolved: ResolvedFilters = {
      accountIds: [],
      merchantPatterns: [],
      categories: [],
      tags: [],
      dateRange: null,
      amountFilter: null,
      transactionType: extracted.transactionType,
      sortBy: extracted.sortBy,
      limit: extracted.limit,
    };

    // Resolve accounts
    if (extracted.accounts) {
      resolved.accountIds = this.resolveAccounts(
        extracted.accounts,
        vocabulary.accounts
      );
    }

    // Resolve categories
    if (extracted.categories) {
      resolved.categories = this.resolveCategories(
        extracted.categories,
        vocabulary.categories
      );
    }

    // Resolve merchants (keep as patterns for text search)
    if (extracted.merchants) {
      resolved.merchantPatterns = extracted.merchants.map((m) =>
        this.normalizeMerchantPattern(m)
      );
    }

    // Resolve tags
    if (extracted.tags) {
      resolved.tags = this.resolveTags(extracted.tags, vocabulary.tags);
    }

    // Resolve date range
    resolved.dateRange = this.resolveDateRange(extracted.timeframe);

    // Pass through amount filter
    resolved.amountFilter = extracted.amountFilter;

    return resolved;
  }

  private resolveAccounts(
    accountNames: string[],
    availableAccounts: AccountReference[]
  ): string[] {
    const resolvedIds: string[] = [];

    for (const searchName of accountNames) {
      const normalizedSearch = searchName.toLowerCase().trim();

      // Try exact match first
      let match = availableAccounts.find(
        (a) => a.name.toLowerCase() === normalizedSearch
      );

      // Try nickname match
      if (!match) {
        match = availableAccounts.find(
          (a) => a.nickname?.toLowerCase() === normalizedSearch
        );
      }

      // Try alias match
      if (!match) {
        match = availableAccounts.find((a) =>
          a.aliases.some((alias) => alias === normalizedSearch)
        );
      }

      // Try partial match on name or institution
      if (!match) {
        match = availableAccounts.find(
          (a) =>
            a.name.toLowerCase().includes(normalizedSearch) ||
            a.institution.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(a.institution.toLowerCase())
        );
      }

      // Try fuzzy match (contains any word)
      if (!match) {
        const searchWords = normalizedSearch.split(/\s+/);
        match = availableAccounts.find((a) => {
          const accountWords =
            `${a.name} ${a.institution} ${a.type}`.toLowerCase();
          return searchWords.some((word) => accountWords.includes(word));
        });
      }

      if (match) {
        resolvedIds.push(match.id);
      }
    }

    return [...new Set(resolvedIds)]; // Deduplicate
  }

  private resolveCategories(
    categoryNames: string[],
    availableCategories: CategoryReference[]
  ): string[] {
    const resolved: string[] = [];

    for (const searchName of categoryNames) {
      const normalizedSearch = searchName.toLowerCase().trim();

      // Exact match
      let match = availableCategories.find(
        (c) => c.name.toLowerCase() === normalizedSearch
      );

      // Partial match
      if (!match) {
        match = availableCategories.find(
          (c) =>
            c.name.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(c.name.toLowerCase())
        );
      }

      // Subcategory match
      if (!match) {
        match = availableCategories.find((c) =>
          c.subcategories?.some((sub) =>
            sub.toLowerCase().includes(normalizedSearch)
          )
        );
      }

      if (match) {
        resolved.push(match.name);
      }
    }

    return [...new Set(resolved)];
  }

  private resolveTags(searchTags: string[], availableTags: string[]): string[] {
    const resolved: string[] = [];

    for (const searchTag of searchTags) {
      const normalizedSearch = searchTag.toLowerCase().trim();

      const match = availableTags.find(
        (t) =>
          t.toLowerCase() === normalizedSearch ||
          t.toLowerCase().includes(normalizedSearch)
      );

      if (match) {
        resolved.push(match);
      }
    }

    return resolved;
  }

  private normalizeMerchantPattern(merchant: string): string {
    // Create a pattern that will work for text search
    return merchant
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private resolveDateRange(timeframe: TimeframeFilter): DateRange | null {
    if (timeframe.type === 'all_time') {
      return null; // No filter
    }

    if (timeframe.type === 'absolute' && timeframe.startDate) {
      return {
        start: new Date(timeframe.startDate),
        end: timeframe.endDate ? new Date(timeframe.endDate) : new Date(),
      };
    }

    // Relative period
    return this.resolveRelativePeriod(timeframe.period || 'last_30_days');
  }

  private resolveRelativePeriod(period: RelativePeriod): DateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const periods: Record<RelativePeriod, () => DateRange> = {
      today: () => ({ start: today, end: now }),

      yesterday: () => {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        // Yesterday full day
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterday, end: yesterdayEnd };
      },

      this_week: () => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: now };
      },

      last_week: () => {
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
        return { start: lastWeekStart, end: lastWeekEnd };
      },

      this_month: () => {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: now };
      },

      last_month: () => {
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return { start: lastMonthStart, end: lastMonthEnd };
      },

      last_30_days: () => {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return { start, end: now };
      },

      last_90_days: () => {
        const start = new Date(today);
        start.setDate(today.getDate() - 90);
        return { start, end: now };
      },

      this_year: () => {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      },

      last_year: () => {
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        lastYearEnd.setHours(23, 59, 59, 999);
        return { start: lastYearStart, end: lastYearEnd };
      },
    };

    return (periods[period] || periods['last_30_days'])();
  }
}
