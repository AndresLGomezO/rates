import { db, getCollectionName } from '../utils/firestore.js';
import { UserFinancialContext } from '../types/index.js';

const USERS_COLLECTION = getCollectionName('users');

export class FinancialDataRepository {
  async getFinancialContext(userId: string): Promise<UserFinancialContext> {
    // Parallel fetch for efficiency
    const [accounts, summary, transactions] = await Promise.all([
      this.getAccounts(userId),
      this.getSummary(userId),
      this.getRecentTransactions(userId),
    ]);

    // Note: Budgets and goals would be fetched here too if they existed in the schema

    return {
      accounts,
      summary: summary || undefined, // Convert null to undefined
      recentActivity: transactions,
    };
  }

  private async getAccounts(userId: string) {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection('accounts')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        balance: Number(data.balance) || 0,
        currency: data.currency || 'USD',
      };
    });
  }

  private async getSummary(userId: string) {
    // Ideally this comes from a pre-calculated summary document
    // For now, we might derive it or fetch a profile/summary doc
    const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data?.financialSummary) return null;

    return {
      totalBalance: Number(data.financialSummary.totalBalance) || 0,
      totalDebt: Number(data.financialSummary.totalDebt) || 0,
      netWorth: Number(data.financialSummary.netWorth) || 0,
      monthlyIncome: Number(data.financialSummary.monthlyIncome) || 0,
      monthlyExpenses: Number(data.financialSummary.monthlyExpenses) || 0,
      savingsRate: Number(data.financialSummary.savingsRate) || 0,
    };
  }

  private async getRecentTransactions(userId: string) {
    // Get last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    // Note: This requires an index on date
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection('transactions')
      .where('date', '>=', thirtyDaysAgo.toISOString()) // Assuming ISO string dates
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) return undefined;

    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        amount: Number(data.amount),
        category: data.category,
        date: data.date,
        description: data.description || data.merchantName,
      };
    });

    // Calculate aggregations
    const totalSpent = transactions
      .filter((t) => t.amount > 0) // Assuming positive is expense, might need adjustment based on schema
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Group by category
    const categories: Record<string, { amount: number; count: number }> = {};
    transactions.forEach((t) => {
      if (t.amount > 0) {
        if (!categories[t.category]) {
          categories[t.category] = { amount: 0, count: 0 };
        }
        categories[t.category].amount += t.amount;
        categories[t.category].count += 1;
      }
    });

    const byCategory = Object.entries(categories)
      .map(([cat, stats]) => ({
        category: cat,
        amount: stats.amount,
        transactionCount: stats.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      period: 'Last 30 days',
      totalSpent,
      totalIncome,
      byCategory,
      largestExpenses: transactions
        .filter((t) => t.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((t) => ({
          description: t.description,
          amount: t.amount,
          date: t.date,
          category: t.category,
        })),
    };
  }
}
