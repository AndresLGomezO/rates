import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.ENV === 'prod' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      // Cloud Logging uses 'severity' instead of 'level'
      return { severity: label.toUpperCase() };
    },
  },
  // Add base fields useful for Cloud Run
  base: {
    service: 'ai-processor',
    env: config.ENV,
    job_name: config.CLOUD_RUN_JOB,
    execution_id: config.CLOUD_RUN_EXECUTION,
    task_index: config.CLOUD_RUN_TASK_INDEX,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
