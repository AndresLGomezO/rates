import { PromptTemplate } from '../template-engine';

export const EXTRACTION_TEMPLATES: Record<string, PromptTemplate> = {
  entities: {
    id: 'extraction-entities',
    name: 'Entity Extraction',
    description: 'Extract named entities from text',
    template: `Extract all named entities (Person, Organization, Location) from the following text:

Text: {{text}}

Format as JSON list of objects with 'name' and 'type'.`,
    variables: [{ name: 'text', type: 'string', required: true }],
    recommendedParameters: {
      temperature: 0.0,
      maxOutputTokens: 1024,
    },
  },
  keywords: {
    id: 'extraction-keywords',
    name: 'Keyword Extraction',
    description: 'Extract key terms from text',
    template: `Extract top {{count}} keywords from the following text:

Text: {{text}}

Keywords (comma-separated):`,
    variables: [
      { name: 'text', type: 'string', required: true },
      { name: 'count', type: 'number', required: false, defaultValue: 10 },
    ],
    recommendedParameters: {
      temperature: 0.1,
      maxOutputTokens: 256,
    },
  },
};
