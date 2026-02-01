import { getAuthToken } from '../utils/auth';

// BFF Proxy URL
const AI_PROXY_URL = '/api/ai';

export interface ChatResponse {
  content: string;
  sessionId: string;
  messageId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextTokens: number;
    historyTokens: number;
  };
  contextUsed: string[];
}

export interface ChatRequest {
  prompt: string;
  sessionId?: string;
  // userId is handled by auth token or header injection in proxy
}

/**
 * Sends a chat message to the AI Service.
 * @param prompt The user's message
 * @param sessionId Optional session ID to continue a conversation
 * @returns The AI's response including updated session ID
 */
export async function sendChatMessage(
  prompt: string,
  sessionId?: string
): Promise<ChatResponse> {
  const token = getAuthToken(false);

  if (typeof token !== 'string') {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${AI_PROXY_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({
      prompt,
      sessionId,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string } | string;
    };

    const errorMessage =
      typeof errorData.error === 'string'
        ? errorData.error
        : errorData.error?.message || 'Failed to send message to AI Service';

    throw new Error(errorMessage);
  }

  return response.json() as Promise<ChatResponse>;
}
