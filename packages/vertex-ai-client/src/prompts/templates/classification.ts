import { PromptTemplate } from '../template-engine';

export const CLASSIFICATION_TEMPLATES: Record<string, PromptTemplate> = {
  single: {
    id: 'classification-single',
    name: 'Single Label Classification',
    description: 'Classify content into one category',
    template: `Classify the following text into exactly one of these categories: {{categories}}

Text: {{text}}

Respond with only the category name, nothing else.

Category:`,
    variables: [
      { name: 'text', type: 'string', required: true },
      { name: 'categories', type: 'string', required: true },
    ],
    recommendedParameters: {
      temperature: 0.0,
      maxOutputTokens: 50,
    },
  },

  multiLabel: {
    id: 'classification-multi',
    name: 'Multi-Label Classification',
    description: 'Classify content into multiple categories',
    template: `Classify the following text. Select all applicable categories from: {{categories}}

Text: {{text}}

Respond with applicable categories as a comma-separated list.

Categories:`,
    variables: [
      { name: 'text', type: 'string', required: true },
      { name: 'categories', type: 'string', required: true },
    ],
    recommendedParameters: {
      temperature: 0.0,
      maxOutputTokens: 100,
    },
  },
};
