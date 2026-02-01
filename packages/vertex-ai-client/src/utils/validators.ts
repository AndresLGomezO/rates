import { GenerationParameters, ValidationFailure } from '../types';
import { MODEL_LIMITS } from '../constants/limits';

export class Validators {
  /**
   * Validate generation parameters
   */
  static validateParameters(params: GenerationParameters): ValidationFailure[] {
    const failures: ValidationFailure[] = [];
    const ranges = MODEL_LIMITS.parameterRanges;

    if (params.temperature !== undefined) {
      if (
        params.temperature < ranges.temperature.min ||
        params.temperature > ranges.temperature.max
      ) {
        failures.push({
          field: 'temperature',
          code: 'OUT_OF_RANGE',
          message: `Temperature must be between ${ranges.temperature.min} and ${ranges.temperature.max}`,
        });
      }
    }

    if (params.topP !== undefined) {
      if (params.topP < ranges.topP.min || params.topP > ranges.topP.max) {
        failures.push({
          field: 'topP',
          code: 'OUT_OF_RANGE',
          message: `TopP must be between ${ranges.topP.min} and ${ranges.topP.max}`,
        });
      }
    }

    if (params.topK !== undefined) {
      if (params.topK < ranges.topK.min || params.topK > ranges.topK.max) {
        failures.push({
          field: 'topK',
          code: 'OUT_OF_RANGE',
          message: `TopK must be between ${ranges.topK.min} and ${ranges.topK.max}`,
        });
      }
    }

    if (params.maxOutputTokens !== undefined) {
      if (
        params.maxOutputTokens < ranges.maxOutputTokens.min ||
        params.maxOutputTokens > ranges.maxOutputTokens.max
      ) {
        failures.push({
          field: 'maxOutputTokens',
          code: 'OUT_OF_RANGE',
          message: `MaxOutputTokens must be between ${ranges.maxOutputTokens.min} and ${ranges.maxOutputTokens.max}`,
        });
      }
    }

    if (params.stopSequences !== undefined) {
      if (params.stopSequences.length > ranges.stopSequences.maxCount) {
        failures.push({
          field: 'stopSequences',
          code: 'TOO_MANY_ITEMS',
          message: `StopSequences cannot exceed ${ranges.stopSequences.maxCount} items`,
        });
      }
    }

    return failures;
  }
}
