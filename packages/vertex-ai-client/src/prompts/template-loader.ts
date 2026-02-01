import { PromptTemplate } from './template-engine';
import { ValidationError } from '../errors/vertex-error';
import {
  SUMMARIZATION_TEMPLATES,
  CLASSIFICATION_TEMPLATES,
  EXTRACTION_TEMPLATES,
} from './templates';

export type BuiltInTemplate =
  | 'summarization-brief'
  | 'summarization-detailed'
  | 'summarization-bullets'
  | 'classification-single'
  | 'classification-multi'
  | 'extraction-entities'
  | 'extraction-keywords';

/**
 * Load a built-in template by ID
 */
export function loadTemplate(templateId: BuiltInTemplate): PromptTemplate {
  const allTemplates = {
    ...SUMMARIZATION_TEMPLATES,
    ...CLASSIFICATION_TEMPLATES,
    ...EXTRACTION_TEMPLATES,
  };

  // Find by ID directly or by iterating if keys don't match IDs (they likely don't).
  // The keys in the constants are like 'brief', 'detailed', but IDs are 'summarization-brief'.
  // So we iterate.
  const template = Object.values(allTemplates).find((t) => t.id === templateId);

  if (!template) {
    throw new ValidationError(`Template not found: ${templateId}`);
  }

  return template;
}

/**
 * List all available templates
 */
export function listTemplates(): PromptTemplate[] {
  return [
    ...Object.values(SUMMARIZATION_TEMPLATES),
    ...Object.values(CLASSIFICATION_TEMPLATES),
    ...Object.values(EXTRACTION_TEMPLATES),
  ];
}
