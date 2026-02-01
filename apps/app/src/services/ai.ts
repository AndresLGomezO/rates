import { getAuthToken } from '../utils/auth';

const AI_SERVICE_URL =
  (import.meta.env.VITE_AI_SERVICE_URL as string) || 'http://localhost:8080';

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

  const response = await fetch(`${AI_SERVICE_URL}/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-Authorization': `Bearer ${token}`,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({
      prompt,
      systemContext,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      errorData.error?.message || 'Failed to send message to AI Service'
    );
  }

  return response.json() as Promise<GenerateResponse>;
}
