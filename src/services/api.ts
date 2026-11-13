import { ChatMessage, ProviderId, ReasoningEffortLevel, SkillPlugin, UserSettings } from '../types';

export interface StreamChatParams {
  messages: ChatMessage[];
  modelId: string;
  providerId: ProviderId;
  reasoningEffort?: ReasoningEffortLevel;
  systemPrompt?: string;
  settings: UserSettings;
  activeSkills?: SkillPlugin[];
  onChunk: (chunk: { text: string; reasoningText?: string; toolCalls?: any[] }) => void;
  onError: (error: string) => void;
  onFinish: (fullText: string, reasoningText?: string) => void;
  signal?: AbortSignal;
}

export async function streamChatCompletion({
  messages,
  modelId,
  providerId,
  reasoningEffort = 'medium',
  systemPrompt,
  settings,
  activeSkills = [],
  onChunk,
  onError,
  onFinish,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    // Format tools for model function calling schema if skills are active
    const enabledTools = activeSkills
      .filter((s) => s.enabled)
      .flatMap((s) => s.tools);

    const payload = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        attachments: m.attachments?.map((att) => ({
          id: att.id,
          name: att.name,
          size: att.size,
          mimeType: att.mimeType,
          kind: att.kind,
          summary: att.summary,
          extractedText: att.extractedText,
          imageDataUrl: att.imageDataUrl,
          inlineBase64: att.inlineBase64,
          uploadId: att.uploadId,
        })),
      })),
      modelId,
      providerId,
      reasoningEffort,
      systemPrompt,
      apiKey: settings.apiKeys[providerId] || '',
      ollamaBaseUrl: settings.ollamaBaseUrl || 'http://localhost:11434',
      xkiroBaseUrl: settings.xkiroBaseUrl || 'https://api.xkiro.com/v1',
      ashnaBaseUrl: settings.ashnaBaseUrl || 'https://api.ashna.ai/v1/api',
      ashnaCustomModel: settings.ashnaCustomModel || '',
      temperature: settings.temperature ?? 0.7,
      tools: enabledTools.length > 0 ? enabledTools : undefined,
    };

    const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
    const endpoint = `${apiBase}/api/chat`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const rawErr = await response.text().catch(() => '');
      try {
        const errJson = JSON.parse(rawErr);
        throw new Error(errJson.error || errJson.message || `Erro no servidor (${response.status})`);
      } catch (parseErr: any) {
        if (parseErr instanceof Error && parseErr.message && !rawErr.trim().startsWith('<')) {
          throw parseErr;
        }
        if (response.status === 404 || rawErr.trim().startsWith('<')) {
          throw new Error(
            `Rota /api/chat indisponível (HTTP ${response.status}). No Netlify, faça o deploy com netlify.toml e netlify/functions/api.ts ativos (Git ou Netlify CLI).`
          );
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
    }

    if (contentType.includes('text/html')) {
      throw new Error(
        'O endpoint /api/chat retornou HTML em vez de streaming. No Netlify, faça o deploy completo com netlify.toml e netlify/functions/api.ts ativos.'
      );
    }

    if (!response.body) {
      throw new Error('A resposta do servidor não possui corpo de streaming.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullText = '';
    let reasoningText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') {
            onFinish(fullText, reasoningText);
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              onError(parsed.error);
              return;
            }

            if (parsed.reasoning) {
              reasoningText += parsed.reasoning;
            }
            if (parsed.delta) {
              fullText += parsed.delta;
            }

            onChunk({
              text: parsed.delta || '',
              reasoningText: parsed.reasoning || '',
              toolCalls: parsed.toolCalls,
            });
          } catch (e) {
            // Raw text chunk stream
            fullText += dataStr;
            onChunk({ text: dataStr });
          }
        }
      }
    }

    onFinish(fullText, reasoningText);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      onFinish('', '');
      return;
    }
    onError(err.message || 'Erro na comunicação com a API de IA');
  }
}
