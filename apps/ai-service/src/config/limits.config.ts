import { config } from './index.js';

export const limitsConfig = {
  requestsPerMinute: parseInt(
    process.env.RATE_LIMIT_REQUESTS_PER_MIN || '10',
    10
  ),
  tokensPerDay: parseInt(process.env.RATE_LIMIT_TOKENS_PER_DAY || '10000', 10),
  concurrentRequests: 3,
  asyncTasksPerHour: 5,
};
