import { getAuthToken } from '../utils/auth';
import { type CreateFinancialAccountInput } from '@rates/firebase-client';

// BFF Proxy URL (Same Origin)
const AI_PROXY_URL = '/api/ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Sends a message to the AI Service for text generation.
 * @param prompt The user's message/prompt
 * @param systemContext Optional system instructions/context
 * @returns The AI's response and usage metrics
 */
export async function sendMessage(
  prompt: string,
  systemContext?: string
): Promise<GenerateResponse> {
  const token = getAuthToken(false);

  if (typeof token !== 'string') {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${AI_PROXY_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({
      prompt,
      systemContext,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorData.error || 'Failed to generate content');
  }

  return response.json() as Promise<GenerateResponse>;
}

/**
 * Extracts financial account details from a document.
 * @param file Base64 encoded file string
 * @param mimeType MIME type of the file
 */
export async function extractDocument(
  file: string,
  mimeType: string
): Promise<Partial<CreateFinancialAccountInput>> {
  const token = getAuthToken(false);

  if (typeof token !== 'string') {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${AI_PROXY_URL}/extract/document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({
      file,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorData.error || 'Failed to extract document');
  }

  return response.json() as Promise<Partial<CreateFinancialAccountInput>>;
}
