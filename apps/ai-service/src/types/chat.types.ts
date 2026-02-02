import { Timestamp } from '@google-cloud/firestore';

// --- Firestore Data Models ---

export interface ChatSession {
  // Document ID: auto-generated
  id: string;

  // Owner
  userId: string;

  // Session metadata
  title: string; // Auto-generated from first message
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Status
  status: 'active' | 'archived';

  // Stats
  messageCount: number;
  totalTokensUsed: number;

  // Summary for quick context (updated periodically)
  summary?: string;
}

export interface ChatMessage {
  // Document ID: auto-generated
  id: string;

  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;

  // Metadata
  tokenCount?: number;
  model?: string;

  // For user messages: what data categories were used
  contextCategories?: DataCategory[];
}

// --- Context & Financial Data ---

export type DataCategory =
  | 'accounts_summary'
  | 'account_balances'
  | 'recent_transactions'
  | 'spending_by_category'
  | 'income_summary'
  | 'budgets'
  | 'goals'
  | 'savings_rate'
  | 'time_comparison';

export interface UserFinancialContext {
  // Account summary
  accounts?: {
    id: string;
    name: string;
    type: string; // 'checking' | 'savings' | 'credit' | 'investment'
    balance: number;
    currency: string;
  }[];

  // Aggregated metrics
  summary?: {
    totalBalance: number;
    totalDebt: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
  };

  // Recent transactions (summarized/categorized)
  recentActivity?: {
    period: string; // "Last 30 days"
    totalSpent: number;
    totalIncome: number;
    byCategory: {
      category: string;
      amount: number;
      transactionCount: number;
    }[];
    largestExpenses: {
      description: string;
      amount: number;
      date: string;
      category: string;
    }[];
  };

  // Budget status
  budgets?: {
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentUsed: number;
  }[];

  // Goals
  goals?: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    percentComplete: number;
    targetDate?: string;
  }[];
}

export interface BuiltContext {
  systemPrompt: string;
  conversationHistory: string;
  categoriesUsed: DataCategory[];
  tokenEstimate: {
    system: number;
    history: number;
    prompt: number;
  };
}

// --- API Request/Response Types ---

export interface ChatRequest {
  prompt: string;
  sessionId?: string;
  userId?: string; // Injected by auth middleware or passed in dev
  maxHistoryMessages?: number;
}

export interface ChatResponse {
  content: string;
  sessionId: string;
  messageId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextTokens: number;
    historyTokens: number;
  };
  contextUsed: DataCategory[];
}

// --- Entity Resolution Types ---

export interface UserVocabulary {
  accounts: AccountReference[];
  categories: CategoryReference[];
  merchants: string[];
  tags: string[];
  locale: string;
  currency: string;
}

export interface AccountReference {
  id: string;
  name: string;
  institution: string;
  type: string;
  nickname?: string;
  lastFour?: string;
  aliases: string[];
  // Expanded fields for context
  currentBalance?: number;
  currency?: string;
  nextDueDate?: Timestamp;
  interestRate?: number;
  creditLimit?: number;
}

export interface CategoryReference {
  name: string;
  subcategories?: string[];
  icon?: string;
  isCustom: boolean;
}

export interface ExtractedEntities {
  intent: IntentType;
  accounts: string[] | null;
  merchants: string[] | null;
  categories: string[] | null;
  tags: string[] | null;
  timeframe: TimeframeFilter;
  amountFilter: AmountFilter | null;
  transactionType: 'expense' | 'income' | 'transfer' | 'all';
  sortBy: 'date' | 'amount' | 'merchant';
  limit: number | null;
  confidence: number;
}

export type IntentType =
  | 'account_balance'
  | 'account_list'
  | 'transaction_search'
  | 'transaction_sum'
  | 'transaction_count'
  | 'spending_analysis'
  | 'comparison'
  | 'general_question';

export interface TimeframeFilter {
  type: 'relative' | 'absolute' | 'all_time';
  period: RelativePeriod | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
}

export type RelativePeriod =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'last_year';

export interface AmountFilter {
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  value: number | null;
  valueTo: number | null;
}

export interface ResolvedFilters {
  accountIds: string[];
  merchantPatterns: string[];
  categories: string[];
  tags: string[];
  dateRange: DateRange | null;
  amountFilter: AmountFilter | null;
  transactionType: 'expense' | 'income' | 'transfer' | 'all';
  sortBy: 'date' | 'amount' | 'merchant';
  limit: number | null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  amount: number;
  description: string;
  merchantName?: string;
  category?: string;
  accountId?: string;
  [key: string]: unknown;
}

export interface AggregationResult {
  totalSpent: number;
  totalIncome: number;
  count: number;
  byCategory: { category: string; amount: number; count: number }[];
  byMerchant: { merchant: string; amount: number; count: number }[];
}

export interface FinancialData {
  accounts: AccountReference[];
  transactions: Transaction[] | null;
  aggregations: AggregationResult | null;
  comparison?: unknown | null;
}
