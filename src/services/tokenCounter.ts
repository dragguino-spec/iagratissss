import { ChatMessage } from '../types';

/**
 * Estimates token count for text content using character & word heuristics (~4 chars per token for Latin languages)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Code & special characters tend to consume slightly more tokens per character
  const isCodeLike = text.includes('```') || text.includes('function') || text.includes('<div');
  const ratio = isCodeLike ? 3.3 : 3.8;
  return Math.ceil(text.length / ratio);
}

/**
 * Calculates total tokens in a message list
 */
export function calculateConversationTokens(messages: ChatMessage[], systemPrompt?: string): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  let promptTokens = estimateTokens(systemPrompt || '');
  let completionTokens = 0;

  messages.forEach((msg) => {
    const count = estimateTokens(msg.content) + estimateTokens(msg.reasoningContent || '');
    if (msg.role === 'assistant') {
      completionTokens += count;
    } else {
      promptTokens += count;
    }
  });

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

/**
 * Truncates or compresses messages if context limit is exceeded
 */
export function optimizeMessagesContext(
  messages: ChatMessage[],
  maxTokens: number = 128000,
  reserveTokens: number = 4096
): { optimizedMessages: ChatMessage[]; isTruncated: boolean; removedCount: number } {
  const targetBudget = maxTokens - reserveTokens;
  let currentTotal = calculateConversationTokens(messages).totalTokens;

  if (currentTotal <= targetBudget || messages.length <= 2) {
    return { optimizedMessages: messages, isTruncated: false, removedCount: 0 };
  }

  // Preserve initial system/user prompt if possible, plus latest conversation turns
  const keepFirst = messages.length > 0 ? messages[0] : null;
  const restMessages = messages.slice(1);
  const truncatedList: ChatMessage[] = [];

  let accumulated = keepFirst ? estimateTokens(keepFirst.content) : 0;
  let removedCount = 0;

  // Traverse from newest to oldest
  for (let i = restMessages.length - 1; i >= 0; i--) {
    const msg = restMessages[i];
    const msgTokens = estimateTokens(msg.content) + estimateTokens(msg.reasoningContent || '');
    if (accumulated + msgTokens <= targetBudget) {
      truncatedList.unshift(msg);
      accumulated += msgTokens;
    } else {
      removedCount++;
    }
  }

  if (keepFirst) {
    truncatedList.unshift(keepFirst);
  }

  return {
    optimizedMessages: truncatedList,
    isTruncated: removedCount > 0,
    removedCount,
  };
}
