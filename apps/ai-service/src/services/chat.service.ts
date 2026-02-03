import {
  UserVocabularyService,
  EntityExtractionService,
  EntityResolutionService,
  TransactionQueryService,
  ContextBuilderService,
} from './index.js';
import { vertexAIService } from './vertex-ai.service.js';
import {
  ChatSessionRepository,
  ChatMessageRepository,
} from '../repositories/index.js';
import {
  ChatResponse,
  FinancialData,
  IntentType,
  ResolvedFilters,
  UserVocabulary,
} from '../types/chat.types.js';

export interface ChatParams {
  userId: string;
  prompt: string;
  sessionId?: string;
}

export class ChatService {
  constructor(
    private vocabularyService: UserVocabularyService,
    private entityExtractor: EntityExtractionService,
    private entityResolver: EntityResolutionService,
    private transactionQuery: TransactionQueryService,
    private contextBuilder: ContextBuilderService,
    private sessionRepository: ChatSessionRepository,
    private messageRepository: ChatMessageRepository
  ) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    const { userId, prompt, sessionId } = params;

    // 1. Get or create session
    let session;
    if (sessionId) {
      session = await this.sessionRepository.get(sessionId);
      if (!session || session.userId !== userId) {
        throw new Error('Session not found or access denied');
      }
    } else {
      session = await this.sessionRepository.create(userId, prompt);
    }

    // 2. Fetch user's vocabulary (lightweight - names only)
    const vocabulary = await this.vocabularyService.getUserVocabulary(userId);

    // 3. Get recent conversation for context
    const conversationContext = await this.getRecentConversation(session.id);

    // 4. STEP 1: LLM Entity Extraction
    const extracted = await this.entityExtractor.extractEntities(
      prompt,
      vocabulary,
      conversationContext
    );

    console.log('Extracted entities:', JSON.stringify(extracted, null, 2));

    // 5. STEP 2: Entity Resolution (no LLM)
    const resolvedFilters = this.entityResolver.resolveEntities(
      extracted,
      vocabulary
    );

    console.log('Resolved filters:', JSON.stringify(resolvedFilters, null, 2));

    // 6. STEP 3: Fetch relevant data
    const financialData = await this.fetchFinancialData(
      userId,
      extracted.intent,
      resolvedFilters,
      vocabulary
    );

    // 7. STEP 4: Build context and generate response
    const context = await this.contextBuilder.buildContextFromData(
      financialData,
      extracted,
      vocabulary
    );

    // 8. Generate response
    // STRATEGY CHANGE: Move financial data context to the USER PROMPT to bypass system prompt safety overrides.

    // Extract instructions (simple) vs data
    const simpleSystemPrompt =
      'You are a helpful financial assistant. Answer based on the provided data.';
    const fullContextPrompt = `${context.systemPrompt}\n\nUSER QUESTION: ${prompt}`;

    const finalUserPrompt = this.buildFinalPrompt(
      fullContextPrompt,
      conversationContext
    );

    console.log(
      '--- [ChatService] Final Prompt Debug (Context Moved to User Prompt) ---'
    );
    console.log('System Instruction:', simpleSystemPrompt);
    console.log('User Prompt Length:', finalUserPrompt.length);
    console.log('----------------------------------------');

    const response = await vertexAIService.generateContent({
      prompt: finalUserPrompt,
      systemContext: simpleSystemPrompt,
      parameters: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
      ],
    });

    // 9. Save to history
    // Save User Message
    await this.messageRepository.create({
      sessionId: session.id,
      role: 'user',
      content: prompt,
      contextCategories: context.categoriesUsed, // Updated context builder should return this
    });

    // Save Assistant Message
    const assistantMessage = await this.messageRepository.create({
      sessionId: session.id,
      role: 'assistant',
      content: response.content,
      tokenCount: response.usage.outputTokens,
      model: response.model || 'gemini-pro',
    });

    // Update Session Stats
    await this.sessionRepository.update(session.id, {
      messageCount: session.messageCount + 2,
      totalTokensUsed: session.totalTokensUsed + response.usage.totalTokens,
    });

    // 10. Return response
    return {
      content: response.content,
      sessionId: session.id,
      messageId: assistantMessage.id,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        contextTokens: context.tokenEstimate.system,
        historyTokens: context.tokenEstimate.history,
      },
      contextUsed: context.categoriesUsed,
      // debug: { ... } // Could add debug info here if type allowed
    };
  }

  private async fetchFinancialData(
    userId: string,
    intent: IntentType,
    filters: ResolvedFilters,
    vocabulary: UserVocabulary
  ): Promise<FinancialData> {
    const data: FinancialData = {
      accounts: [],
      transactions: null,
      aggregations: null,
    };

    // Always include relevant accounts
    if (filters.accountIds.length > 0) {
      data.accounts = vocabulary.accounts.filter((a) =>
        filters.accountIds.includes(a.id)
      );
    } else {
      // Include all accounts for balance queries or if no specific account mentioned
      // For general questions, providing all accounts context is usually helpful
      data.accounts = vocabulary.accounts;
    }

    // Fetch transactions based on intent
    switch (intent) {
      case 'account_balance':
      case 'account_list':
        // Just need account data, already have it
        break;

      case 'transaction_search': {
        // Need actual transactions
        const searchResult = await this.transactionQuery.query(
          userId,
          filters,
          { limit: filters.limit || 20, includeDetails: true } // Limit search results
        );
        data.transactions = searchResult.transactions;
        data.aggregations = searchResult.aggregations;
        break;
      }

      case 'transaction_sum':
      case 'transaction_count':
      case 'spending_analysis': {
        // Need aggregations
        const analysisResult = await this.transactionQuery.query(
          userId,
          filters,
          { limit: 500, includeDetails: false } // Analyze up to 500 recent
        );
        data.aggregations = analysisResult.aggregations;
        break;
      }

      case 'comparison':
        // Need data for multiple periods - simplified for now
        // data.comparison = await this.fetchComparisonData(userId, filters);
        break;

      default: {
        // General question - fetch summary of last 30 days
        // We modify filters to force last 30 days if no date range specified
        // Logic to properly clone/update filters would go here
        const summaryResult = await this.transactionQuery.query(
          userId,
          filters, // Use resolved filters which default to last 30 days if empty
          { limit: 50 }
        );
        data.aggregations = summaryResult.aggregations;
        data.transactions = summaryResult.transactions;
      }
    }

    return data;
  }

  private async getRecentConversation(sessionId: string): Promise<string> {
    const messages = await this.messageRepository.listBySession(sessionId, 5); // Last 5 messages
    if (!messages || messages.length === 0) return '';

    return messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
  }

  private buildFinalPrompt(
    userPrompt: string,
    conversationContext?: string
  ): string {
    if (conversationContext) {
      return `${conversationContext}\n\nUser: ${userPrompt}`;
    }
    return userPrompt;
  }
}
