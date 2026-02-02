import { vertexAIService } from './vertex-ai.service.js';
import {
  ExtractedEntities,
  UserVocabulary,
  IntentType,
  TimeframeFilter,
  AmountFilter,
} from '../types/chat.types.js';

export class EntityExtractionService {
  /**
   * Use LLM to extract structured entities from user prompt
   */
  async extractEntities(
    prompt: string,
    vocabulary: UserVocabulary,
    conversationContext?: string
  ): Promise<ExtractedEntities> {
    const extractionPrompt = this.buildExtractionPrompt(
      prompt,
      vocabulary,
      conversationContext
    );
    console.log(
      `[EntityExtraction] Prompt sent to Vertex (${extractionPrompt.length} chars)`
    );

    // Debug: Log the part of the prompt containing accounts to verify they are present
    const accountSectionMatch = extractionPrompt.match(
      /USER'S ACCOUNTS:([\s\S]*?)USER'S CATEGORIES:/
    );
    if (accountSectionMatch) {
      console.log(
        `[EntityExtraction] Account section in prompt:\n${accountSectionMatch[1].trim()}`
      );
    } else {
      console.warn(
        '[EntityExtraction] Could not find account section in generated prompt!'
      );
    }

    const response = await vertexAIService.generateContent({
      prompt: extractionPrompt,
      systemContext: this.getExtractionSystemPrompt(),
      parameters: {
        temperature: 0, // Deterministic for structured extraction
        maxOutputTokens: 1024, // Increased for safety
        topP: 0.1,
      },
    });

    console.log('[EntityExtraction] Raw LLM Response:', response.content);

    // Parse JSON response
    return this.parseExtractionResponse(response.content);
  }

  private getExtractionSystemPrompt(): string {
    return `You are a financial query parser. Your job is to extract structured information from user queries about their finances.

You must ALWAYS respond with valid JSON matching the specified schema.
You must ONLY use values from the provided lists when matching accounts, categories, or merchants.
If you cannot find a match, use null for that field.
Be flexible with spelling and language - match the user's intent to the closest available option.

Response format:
{
  "intent": "account_balance" | "account_list" | "transaction_search" | "transaction_sum" | "transaction_count" | "spending_analysis" | "comparison" | "general_question",
  "accounts": ["exact account name from list"] | null,
  "merchants": ["merchant name or search term"] | null,
  "categories": ["exact category name from list"] | null,
  "tags": ["exact tag from list"] | null,
  "timeframe": {
    "type": "relative" | "absolute" | "all_time",
    "period": "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "last_30_days" | "last_90_days" | "this_year" | "last_year" | null,
    "startDate": "YYYY-MM-DD" | null,
    "endDate": "YYYY-MM-DD" | null
  },
  "amountFilter": {
    "operator": "greater_than" | "less_than" | "equals" | "between" | null,
    "value": number | null,
    "valueTo": number | null
  } | null,
  "transactionType": "expense" | "income" | "transfer" | "all" | null,
  "sortBy": "date" | "amount" | "merchant" | null,
  "limit": number | null,
  "confidence": number (0-1)
}`;
  }

  private buildExtractionPrompt(
    prompt: string,
    vocabulary: UserVocabulary,
    conversationContext?: string
  ): string {
    const sections: string[] = [];

    // User's available accounts
    sections.push(`USER'S ACCOUNTS:
${vocabulary.accounts
  .map(
    (a) =>
      `- "${a.name}" (${a.institution}, ${a.type})${a.nickname ? ` aka "${a.nickname}"` : ''}`
  )
  .join('\n')}`);

    // User's categories
    sections.push(`USER'S CATEGORIES:
${vocabulary.categories.map((c) => `- "${c.name}"`).join('\n')}`);

    // User's frequent merchants
    sections.push(`USER'S FREQUENT MERCHANTS (for reference):
${vocabulary.merchants
  .slice(0, 50)
  .map((m) => `- "${m}"`)
  .join('\n')}`);

    // User's tags
    if (vocabulary.tags.length > 0) {
      sections.push(`USER'S TAGS:
${vocabulary.tags.map((t) => `- "${t}"`).join('\n')}`);
    }

    // User's locale/currency for context
    sections.push(`USER'S LOCALE: ${vocabulary.locale}
USER'S CURRENCY: ${vocabulary.currency}`);

    // Conversation context for reference resolution
    if (conversationContext) {
      sections.push(`RECENT CONVERSATION (for context):
${conversationContext}`);
    }

    // The actual query
    sections.push(`USER QUERY: "${prompt}"`);

    sections.push(`Extract the structured information from the user query. Match account names, categories, and merchants to the exact values from the lists above when possible. If the user refers to something not in the lists (like a new merchant), include it as-is for text search.

Respond with JSON only, no explanation.`);

    return sections.join('\n\n');
  }

  private parseExtractionResponse(content: string): ExtractedEntities {
    // Clean up response (remove markdown code blocks if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }

    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }

    try {
      const parsed = JSON.parse(jsonContent.trim());
      return this.validateAndNormalize(parsed);
    } catch (error) {
      // Return default/empty extraction on parse failure
      console.error('Failed to parse entity extraction:', error);
      // console.error('Raw content:', content);
      return this.getDefaultExtraction();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateAndNormalize(parsed: any): ExtractedEntities {
    const normalizeArray = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
      alternatives: string[] = []
    ): string[] | null => {
      // Check primary value
      let target = value;

      // Check alternatives if primary is missing
      if (!target) {
        for (const alt of alternatives) {
          if (parsed[alt]) {
            target = parsed[alt];
            break;
          }
        }
      }

      if (!target) return null;
      if (Array.isArray(target))
        return target.filter((i) => typeof i === 'string');
      if (typeof target === 'string') return [target];
      return null;
    };

    return {
      intent: this.validateIntent(parsed.intent),
      accounts: normalizeArray(parsed.accounts, [
        'account',
        'account_name',
        'account_names',
      ]),
      merchants: normalizeArray(parsed.merchants, [
        'merchant',
        'merchant_name',
        'merchant_names',
      ]),
      categories: normalizeArray(parsed.categories, [
        'category',
        'category_name',
        'category_names',
      ]),
      tags: normalizeArray(parsed.tags, ['tag', 'tags']),
      timeframe: this.validateTimeframe(parsed.timeframe),
      amountFilter: this.validateAmountFilter(parsed.amountFilter),
      transactionType: parsed.transactionType || 'all',
      sortBy: parsed.sortBy || 'date',
      limit: typeof parsed.limit === 'number' ? parsed.limit : null,
      confidence:
        typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  }

  private validateIntent(intent: string): IntentType {
    const validIntents: IntentType[] = [
      'account_balance',
      'account_list',
      'transaction_search',
      'transaction_sum',
      'transaction_count',
      'spending_analysis',
      'comparison',
      'general_question',
    ];

    return validIntents.includes(intent as IntentType)
      ? (intent as IntentType)
      : 'general_question';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateTimeframe(timeframe: any): TimeframeFilter {
    if (!timeframe) {
      return {
        type: 'relative',
        period: 'last_30_days',
        startDate: null,
        endDate: null,
      };
    }

    return {
      type: timeframe.type || 'relative',
      period: timeframe.period || null,
      startDate: timeframe.startDate || null,
      endDate: timeframe.endDate || null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateAmountFilter(filter: any): AmountFilter | null {
    if (!filter || !filter.operator) return null;

    return {
      operator: filter.operator,
      value: filter.value ?? null,
      valueTo: filter.valueTo ?? null,
    };
  }

  private getDefaultExtraction(): ExtractedEntities {
    return {
      intent: 'general_question',
      accounts: null,
      merchants: null,
      categories: null,
      tags: null,
      timeframe: {
        type: 'relative',
        period: 'last_30_days',
        startDate: null,
        endDate: null,
      },
      amountFilter: null,
      transactionType: 'all',
      sortBy: 'date',
      limit: null,
      confidence: 0.3,
    };
  }
}
