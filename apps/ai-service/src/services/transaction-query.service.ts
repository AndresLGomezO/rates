import { db, getCollectionName } from '../utils/firestore.js';
import {
  ResolvedFilters,
  Transaction,
  AggregationResult,
} from '../types/chat.types.js';

const USERS_COLLECTION = getCollectionName('users');

export interface TransactionQueryResult {
  transactions: Transaction[];
  aggregations: AggregationResult;
}

export class TransactionQueryService {
  async query(
    userId: string,
    filters: ResolvedFilters,
    options: { limit?: number; includeDetails?: boolean } = {}
  ): Promise<TransactionQueryResult> {
    let query = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection('transactions');

    // Apply filters
    // Note: Firestore requires composite indexes for multiple range/order filters.
    // We'll try to apply the most selective filters here and do the rest in memory if needed.
    // OR we just apply basic range filters and filter in memory since user transaction volume might be manageable.

    // 1. Date Range (Most crucial for performance)
    if (filters.dateRange) {
      // Cast to any to bypass strict typing issues with chained queries or defining specific CollectionReference type
      query = query
        .where('date', '>=', filters.dateRange.start.toISOString())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where('date', '<=', filters.dateRange.end.toISOString()) as any;
    }

    // 2. Sorting
    if (filters.dateRange) {
      query = query.orderBy(
        'date',
        filters.sortBy === 'date' ? 'desc' : 'desc'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
    } else if (filters.sortBy === 'date') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.orderBy('date', 'desc') as any;
    } else if (filters.sortBy === 'amount') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.orderBy('amount', 'desc') as any;
    }

    // Execute query
    // We set a safe upper limit to fetch for in-memory processing
    const limit = options.limit ? Math.max(options.limit, 500) : 500;
    const snapshot = await query.limit(limit).get();

    if (snapshot.empty) {
      return this.emptyResult();
    }

    // Process results
    let transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data, // spread existing data
        // Ensure optional fields exist for filtered checks
        accountId: data.accountId || '',
        category: data.category || '',
        merchantName: data.merchantName || '',
        description: data.description || '',
        amount: Number(data.amount) || 0,
        date: data.date,
        timestamp: new Date(data.date).getTime(),
      };
    });

    // --- In-Memory Filtering ---

    // Account Filter
    if (filters.accountIds.length > 0) {
      transactions = transactions.filter((t) =>
        filters.accountIds.includes(t.accountId)
      );
    }

    // Category Filter
    if (filters.categories.length > 0) {
      transactions = transactions.filter((t) =>
        filters.categories.some(
          (cat) => t.category?.toLowerCase() === cat.toLowerCase()
        )
      );
    }

    // Merchant Filter (Pattern Matching)
    if (filters.merchantPatterns.length > 0) {
      transactions = transactions.filter((t) => {
        const merchant = (t.merchantName || t.description || '').toLowerCase();
        return filters.merchantPatterns.some((pattern) =>
          merchant.includes(pattern)
        );
      });
    }

    // Transaction Type Filter
    if (filters.transactionType !== 'all') {
      transactions = transactions.filter((t) => {
        if (filters.transactionType === 'expense') return t.amount > 0;
        if (filters.transactionType === 'income') return t.amount < 0;
        return true; // Transfer logic depends on data model
      });
    }

    // Amount Filter
    if (filters.amountFilter) {
      const { operator, value, valueTo } = filters.amountFilter;
      if (value !== null) {
        transactions = transactions.filter((t) => {
          const amount = Math.abs(t.amount); // compare absolute value
          switch (operator) {
            case 'greater_than':
              return amount > value;
            case 'less_than':
              return amount < value;
            case 'equals':
              return Math.abs(amount - value) < 0.01;
            case 'between':
              return valueTo !== null && amount >= value && amount <= valueTo;
            default:
              return true;
          }
        });
      }
    }

    // Apply final limit if requested
    if (options.limit && transactions.length > options.limit) {
      transactions = transactions.slice(0, options.limit);
    }

    return this.aggregate(transactions);
  }

  private aggregate(transactions: Transaction[]): TransactionQueryResult {
    const totalSpent = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Group by Category
    const catMap = new Map<string, { amount: number; count: number }>();
    // Group by Merchant
    const merchMap = new Map<string, { amount: number; count: number }>();

    for (const t of transactions) {
      if (t.amount > 0) {
        // Category
        const cat = t.category || 'Uncategorized';
        const catStat = catMap.get(cat) || { amount: 0, count: 0 };
        catStat.amount += t.amount;
        catStat.count++;
        catMap.set(cat, catStat);

        // Merchant
        const merch = t.merchantName || t.description || 'Unknown';
        const merchStat = merchMap.get(merch) || { amount: 0, count: 0 };
        merchStat.amount += t.amount;
        merchStat.count++;
        merchMap.set(merch, merchStat);
      }
    }

    const byCategory = Array.from(catMap.entries())
      .map(([category, stat]) => ({ category, ...stat }))
      .sort((a, b) => b.amount - a.amount);

    const byMerchant = Array.from(merchMap.entries())
      .map(([merchant, stat]) => ({ merchant, ...stat }))
      .sort((a, b) => b.amount - a.amount);

    return {
      transactions,
      aggregations: {
        totalSpent,
        totalIncome,
        count: transactions.length,
        byCategory,
        byMerchant,
      },
    };
  }

  private emptyResult(): TransactionQueryResult {
    return {
      transactions: [],
      aggregations: {
        totalSpent: 0,
        totalIncome: 0,
        count: 0,
        byCategory: [],
        byMerchant: [],
      },
    };
  }
}
