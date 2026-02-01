import { PromptTemplate } from '../template-engine';

export const SUMMARIZATION_TEMPLATES: Record<string, PromptTemplate> = {
  brief: {
    id: 'summarization-brief',
    name: 'Brief Summary',
    description: 'Generate a brief summary of the content',
    template: `Summarize the following content in 2-3 sentences:

{{content}}

Summary:`,
    variables: [{ name: 'content', type: 'string', required: true }],
    recommendedParameters: {
      temperature: 0.3,
      maxOutputTokens: 256,
    },
  },

  detailed: {
    id: 'summarization-detailed',
    name: 'Detailed Summary',
    description: 'Generate a detailed summary with key points',
    template: `Provide a detailed summary of the following content. Include:
- Main topic and thesis
- Key points and arguments
- Important details and examples
- Conclusion

Content:
{{content}}

Detailed Summary:`,
    variables: [{ name: 'content', type: 'string', required: true }],
    recommendedParameters: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  },

  bullets: {
    id: 'summarization-bullets',
    name: 'Bullet Point Summary',
    description: 'Generate a bullet-point summary',
    template: `Summarize the following content as {{maxBullets}} bullet points:

{{content}}

Bullet Points:`,
    variables: [
      { name: 'content', type: 'string', required: true },
      { name: 'maxBullets', type: 'number', required: false, defaultValue: 5 },
    ],
    recommendedParameters: {
      temperature: 0.3,
      maxOutputTokens: 512,
    },
  },
};
