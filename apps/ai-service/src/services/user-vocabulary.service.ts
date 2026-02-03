import { db, getCollectionName } from '../utils/firestore.js';
import {
  AccountReference,
  CategoryReference,
  UserVocabulary,
} from '../types/chat.types.js';

const USERS_COLLECTION = getCollectionName('users');

export class UserVocabularyService {
  /**
   * Fetch user's data vocabulary for entity matching
   * This is lightweight - just names/labels, not full data
   */
  async getUserVocabulary(userId: string): Promise<UserVocabulary> {
    console.log(`[UserVocabulary] Fetching vocabulary for user ${userId}`);
    const [accounts, categories, merchants, tags] = await Promise.all([
      this.getAccountNames(userId),
      this.getCategories(),
      this.getTopMerchants(userId),
      this.getUserTags(),
    ]);

    console.log(
      `[UserVocabulary] Fetched ${accounts.length} accounts, ${categories.length} categories, ${merchants.length} merchants`
    );

    if (accounts.length === 0) {
      console.warn(
        '[UserVocabulary] No accounts found. Debugging Firestore path...'
      );
      await this.debugFirestorePath(userId);
    } else {
      console.log(
        '[UserVocabulary] Account names:',
        accounts.map((a) => a.name)
      );
    }

    return {
      accounts,
      categories,
      merchants,
      tags,
      // Defaulting locale/currency for now as they might not be in user profile yet
      locale: 'en-US',
      currency: 'USD',
    };
  }

  private async debugFirestorePath(userId: string) {
    try {
      // Debug check for financialAccounts
      const accountsCol = getCollectionName('financialAccounts');
      const snapshot = await db
        .collection(accountsCol)
        .where('userId', '==', userId)
        .limit(1)
        .get();
      console.log(
        `[UserVocabulary] Check ${accountsCol} where userId=${userId}: found ${snapshot.size} docs`
      );

      if (snapshot.empty) {
        // Check if collection exists at all
        const anyDoc = await db.collection(accountsCol).limit(1).get();
        console.log(
          `[UserVocabulary] Root collection ${accountsCol} explicitly contains ${anyDoc.size} docs (any user)`
        );
      }
    } catch (e) {
      console.error('[UserVocabulary] Error debugging path:', e);
    }
  }

  private async getAccountNames(userId: string): Promise<AccountReference[]> {
    // User reports accounts are in root 'financialAccounts' (or dev_financialAccounts)
    // They should have a 'userId' field matching our user.
    const collectionName = getCollectionName('financialAccounts');
    console.log(
      `[UserVocabulary] Querying accounts in root collection: ${collectionName} where userId == ${userId}`
    );

    const snapshot = await db
      .collection(collectionName)
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // Mapping based on package/firebase-client/src/financial-accounts.ts
      return {
        id: doc.id,
        name: data.accountName || data.name || 'Unknown Account',
        institution: (data['institution'] as string) || '',
        type: data.accountType || data.type || '',
        nickname: (data['nickname'] as string) || data.accountDescription || '',
        lastFour: data.accountNumber ? data.accountNumber.slice(-4) : undefined,
        aliases: this.generateAliases(data),
        // Expanded mapping
        currentBalance:
          data.currentPrincipal?.amount ?? data.currentBalance?.amount ?? 0,
        currency: data.currency || 'USD',
        nextDueDate: data.nextDueDate, // Assuming Firestore Timestamp
        interestRate: data.annualInterestRate ?? data.purchaseApr ?? 0,
        creditLimit: data.creditLimit?.amount,
      };
    });
  }

  private async getCategories(): Promise<CategoryReference[]> {
    // In a real app, we'd fetch custom categories from a collection
    // and maybe distinct categories from transactions.
    // For now, we'll return a static list + any we find in transactions later if needed.
    // This is a placeholder for a more complex implementation.

    // Example static categories
    const defaultCategories = [
      'Food & Dining',
      'Shopping',
      'Transportation',
      'Bills & Utilities',
      'Entertainment',
      'Health & Fitness',
      'Travel',
      'Income',
      'Transfer',
    ];

    const categories: CategoryReference[] = defaultCategories.map((name) => ({
      name,
      isCustom: false,
    }));

    return categories;
  }

  private async getTopMerchants(
    userId: string,
    limit = 100
  ): Promise<string[]> {
    // Get most frequent merchants from recent transactions
    // Note: This requires an index on 'date' if we order by it
    // TODO: Transactions might also be in a root collection. Leaving as-is for now until user confirms.
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(500)
      .get();

    const merchantCounts = new Map<string, number>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Prefer merchantName if normalized, fallback to description (which might be raw)
      const merchant = data.merchantName || data.description;
      if (merchant) {
        const normalized = this.normalizeMerchant(merchant);
        merchantCounts.set(
          normalized,
          (merchantCounts.get(normalized) || 0) + 1
        );
      }
    }

    // Sort by frequency and return top N
    return Array.from(merchantCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .slice(0, limit)
      .map(([merchant]) => merchant); // Return name only
  }

  private async getUserTags(): Promise<string[]> {
    // Placeholder for tags implementation
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generateAliases(account: Record<string, any>): string[] {
    const aliases: string[] = [];

    // Handle mapped fields (accountName, accountType)
    const name = account.accountName || account.name;
    const type = account.accountType || account.type;
    const institution = account.institution; // Might be undefined
    const nickname = account.nickname;

    // Add full name
    if (name) aliases.push(name.toLowerCase());

    // Add institution name
    if (institution) {
      aliases.push(institution.toLowerCase());
    }

    // Add type
    if (type) {
      aliases.push(type.toLowerCase());
    }

    // Add nickname
    if (nickname) {
      aliases.push(nickname.toLowerCase());
    }

    // Add last four digits
    if (account.accountNumber) {
      aliases.push(account.accountNumber.replace(/\*/g, '').trim());
    }

    // Add combined variations
    if (institution && type) {
      aliases.push(`${institution} ${type}`.toLowerCase());
    }

    if (institution && name) {
      aliases.push(`${institution} ${name}`.toLowerCase());
    }

    return aliases;
  }

  private normalizeMerchant(merchant: string): string {
    return merchant
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
