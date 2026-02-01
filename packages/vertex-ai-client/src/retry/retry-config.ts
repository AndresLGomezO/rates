// Re-exporting default retry config if not already done in defaults.
// Actually, I defined retry config interfaces in implementation plan as src/retry/retry-config.ts
// But I put DEFAULT_RETRY_CONFIG in src/config/defaults.ts.
// The spec had: src/retry/retry-config.ts with DEFAULT_RETRY_CONFIG
// I should align with my structure. I will create src/retry/retry-config.ts and re-export or move.
// I will move the config constants to here to match spec better or just re-export.
// Re-exporting is safer to avoid breaking defaults.ts if it's used.
import {
  DEFAULT_RETRY_CONFIG,
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
} from '../config/defaults';

export {
  DEFAULT_RETRY_CONFIG,
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
};
