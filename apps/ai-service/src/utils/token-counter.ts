import { get_encoding } from 'tiktoken';

// Use cl100k_base for Gemini models (approximation using OpenAI's encoding as reference)
// In production, we might want to use Vertex AI's countTokens API, but this is a good local estimation for rate limiting
const encoder = get_encoding('cl100k_base');

export function countTokens(text: string): number {
  if (!text) return 0;
  return encoder.encode(text).length;
}

export function estimateTokens(prompt: string, context?: string): number {
  return countTokens(prompt) + (context ? countTokens(context) : 0);
}
