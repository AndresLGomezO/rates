import {
  FinancialDataRepository,
  ChatMessageRepository,
} from '../repositories/index.js';
import {
  UserFinancialContext,
  DataCategory,
  BuiltContext,
  ChatMessage,
} from '../types/index.js';
import { countTokens } from '../utils/token-counter.js';

interface BuildContextParams {
  userId: string;
  sessionId: string;
  prompt: string;
  maxHistoryMessages?: number;
}

export class ContextBuilderService {
  constructor(
    private financialRepo: FinancialDataRepository,
    private messageRepo: ChatMessageRepository
  ) {}

  /**
   * Build complete context for AI prompt
   */
  async buildContext(params: BuildContextParams): Promise<BuiltContext> {
    const { userId, sessionId, prompt, maxHistoryMessages = 10 } = params;

    // 1. Determine what data categories are needed
    const neededCategories = this.analyzePromptIntent(prompt);

    // 2. Fetch conversation history
    const history = await this.messageRepo.listBySession(
      sessionId,
      maxHistoryMessages
    );

    // 3. Fetch relevant financial data (we currently fetch all, optimization would filter inside repo)
    const financialContext =
      await this.financialRepo.getFinancialContext(userId);

    // 4. Build system prompt
    const systemPrompt = this.buildSystemPrompt(financialContext);

    // 5. Format conversation history
    const formattedHistory = this.formatHistory(history);

    return {
      systemPrompt,
      conversationHistory: formattedHistory,
      categoriesUsed: neededCategories,
      tokenEstimate: {
        system: await countTokens(systemPrompt),
        history: await countTokens(formattedHistory),
        prompt: await countTokens(prompt),
      },
    };
  }

  /**
   * Analyze prompt to determine what financial data is needed
   */
  private analyzePromptIntent(prompt: string): DataCategory[] {
    const promptLower = prompt.toLowerCase();
    const categories: DataCategory[] = [];

    // Always include basic account summary
    categories.push('accounts_summary');

    // Spending/expenses keywords
    if (
      this.matchesKeywords(promptLower, [
        'spend',
        'spent',
        'expense',
        'cost',
        'purchase',
        'bought',
        'pay',
      ])
    ) {
      categories.push('recent_transactions', 'spending_by_category');
    }

    // Income keywords
    if (
      this.matchesKeywords(promptLower, [
        'income',
        'earn',
        'salary',
        'paid',
        'deposit',
        'receive',
      ])
    ) {
      categories.push('income_summary');
    }

    // Budget keywords
    if (
      this.matchesKeywords(promptLower, [
        'budget',
        'limit',
        'allowance',
        'allocated',
      ])
    ) {
      categories.push('budgets');
    }

    // Savings/goals keywords
    if (
      this.matchesKeywords(promptLower, [
        'save',
        'saving',
        'goal',
        'target',
        'progress',
      ])
    ) {
      categories.push('goals', 'savings_rate');
    }

    // Balance keywords
    if (
      this.matchesKeywords(promptLower, [
        'balance',
        'account',
        'how much',
        'total',
        'net worth',
      ])
    ) {
      categories.push('account_balances');
    }

    // Time-based analysis
    if (
      this.matchesKeywords(promptLower, [
        'month',
        'week',
        'year',
        'last',
        'this',
        'previous',
        'compare',
      ])
    ) {
      categories.push('time_comparison');
    }

    return [...new Set(categories)]; // Deduplicate
  }

  /**
   * Build system prompt with financial context
   */
  private buildSystemPrompt(context: UserFinancialContext): string {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `You are a helpful financial assistant for a personal finance app called Rates. 
You help users understand their finances, spending patterns, and provide actionable advice.

CURRENT DATE: ${today}

USER'S FINANCIAL PROFILE:
${this.formatFinancialContext(context)}

GUIDELINES:
- Be concise but informative
- Use specific numbers from the user's data when relevant
- If asked about data you don't have, say so honestly
- Provide actionable suggestions when appropriate
- Format currency amounts clearly (e.g., $1,234.56)
- Never make up financial data - only use what's provided above
- Be encouraging about positive financial behaviors
- Be sensitive when discussing debt or overspending`;
  }

  /**
   * Format financial context as readable text for prompt
   */
  private formatFinancialContext(context: UserFinancialContext): string {
    const sections: string[] = [];

    // Account summary
    if (context.accounts?.length) {
      sections.push(`ACCOUNTS:
${context.accounts
  .map((a) => `- ${a.name} (${a.type}): ${this.formatCurrency(a.balance)}`)
  .join('\n')}`);
    }

    // Overall summary
    if (context.summary) {
      sections.push(`FINANCIAL SUMMARY:
- Total Balance: ${this.formatCurrency(context.summary.totalBalance)}
- Total Debt: ${this.formatCurrency(context.summary.totalDebt)}
- Net Worth: ${this.formatCurrency(context.summary.netWorth)}
- Monthly Income: ${this.formatCurrency(context.summary.monthlyIncome)}
- Monthly Expenses: ${this.formatCurrency(context.summary.monthlyExpenses)}
- Savings Rate: ${(context.summary.savingsRate * 100).toFixed(1)}%`);
    }

    // Recent activity
    if (context.recentActivity) {
      const activity = context.recentActivity;
      sections.push(`RECENT ACTIVITY (${activity.period}):
- Total Spent: ${this.formatCurrency(activity.totalSpent)}
- Total Income: ${this.formatCurrency(activity.totalIncome)}

Spending by Category:
${activity.byCategory
  .map(
    (c) =>
      `- ${c.category}: ${this.formatCurrency(c.amount)} (${c.transactionCount} transactions)`
  )
  .join('\n')}

Largest Expenses:
${activity.largestExpenses
  .slice(0, 5)
  .map(
    (e) => `- ${e.description}: ${this.formatCurrency(e.amount)} on ${e.date}`
  )
  .join('\n')}`);
    }

    // Budgets
    if (context.budgets?.length) {
      sections.push(`BUDGETS:
${context.budgets
  .map(
    (b) =>
      `- ${b.category}: ${this.formatCurrency(b.spent)} / ${this.formatCurrency(b.budgeted)} (${b.percentUsed.toFixed(0)}% used, ${this.formatCurrency(b.remaining)} remaining)`
  )
  .join('\n')}`);
    }

    // Goals
    if (context.goals?.length) {
      sections.push(`SAVINGS GOALS:
${context.goals
  .map(
    (g) =>
      `- ${g.name}: ${this.formatCurrency(g.currentAmount)} / ${this.formatCurrency(g.targetAmount)} (${g.percentComplete.toFixed(0)}% complete)${g.targetDate ? ` - Target: ${g.targetDate}` : ''}`
  )
  .join('\n')}`);
    }

    if (sections.length === 0) {
      return 'No financial data available.';
    }

    return sections.join('\n\n');
  }

  private formatHistory(messages: ChatMessage[]): string {
    if (!messages.length) return '';

    const formatted = messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    return `CONVERSATION HISTORY:\n${formatted}`;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}
