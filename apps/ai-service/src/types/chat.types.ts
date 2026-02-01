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
