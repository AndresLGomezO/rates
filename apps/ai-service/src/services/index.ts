import { VertexAIService } from './vertex-ai.service.js';
import { PubSubService } from './pubsub.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { CacheService } from './cache.service.js';
import { UsageService } from './usage.service.js';
import { AuthService } from './auth.service.js';
export * from './context-builder.service.js';
export * from './user-vocabulary.service.js';
export * from './entity-extraction.service.js';
export * from './entity-resolution.service.js';
export * from './transaction-query.service.js';
export * from './chat.service.js';

import { TaskRepository } from '../repositories/task.repository.js';
import { UsageRepository } from '../repositories/usage.repository.js';
import { RateLimitRepository } from '../repositories/rate-limit.repository.js';
import { CacheRepository } from '../repositories/cache.repository.js';
// Import repos needed for ChatService
import { ChatSessionRepository } from '../repositories/chat-session.repository.js';
import { ChatMessageRepository } from '../repositories/chat-message.repository.js';
import { FinancialDataRepository } from '../repositories/financial-data.repository.js';

import { UserVocabularyService } from './user-vocabulary.service.js';
import { EntityExtractionService } from './entity-extraction.service.js';
import { EntityResolutionService } from './entity-resolution.service.js';
import { TransactionQueryService } from './transaction-query.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { ChatService } from './chat.service.js';

// Repositories
export const taskRepo = new TaskRepository();
export const usageRepo = new UsageRepository();
export const rateLimitRepo = new RateLimitRepository();
export const cacheRepo = new CacheRepository();

// Chat Repos (instantiated here for service injection)
export const chatSessionRepo = new ChatSessionRepository();
export const chatMessageRepo = new ChatMessageRepository();
export const financialDataRepo = new FinancialDataRepository();

// Services
export const vertexAIService = new VertexAIService();
export const pubsubService = new PubSubService();
export const rateLimitService = new RateLimitService(rateLimitRepo, usageRepo);
export const cacheService = new CacheService(cacheRepo);
export const usageService = new UsageService(usageRepo);
export const authService = new AuthService();

// Search/Entity Services
export const userVocabularyService = new UserVocabularyService();
export const entityExtractionService = new EntityExtractionService();
export const entityResolutionService = new EntityResolutionService();
export const transactionQueryService = new TransactionQueryService();
export const contextBuilderService = new ContextBuilderService(
  financialDataRepo,
  chatMessageRepo
);

// Main Chat Service
export const chatService = new ChatService(
  userVocabularyService,
  entityExtractionService,
  entityResolutionService,
  transactionQueryService,
  contextBuilderService,
  chatSessionRepo,
  chatMessageRepo
);
