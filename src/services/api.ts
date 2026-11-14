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

    if (contentType.includes('application/json')) {
      const json: any = await response.json().catch(() => ({}));
      if (json?.error) {
        onError(String(json.error));
        return;
      }
      const txt = String(json?.text || json?.delta || json?.reply || json?.content || '');
      const reason = String(json?.reasoning || '');
      if (txt || reason) {
        onChunk({ text: txt, reasoningText: reason });
        onFinish(txt, reason);
        return;
      }
      onError('O servidor retornou uma resposta vazia. Verifique sua chave de API ou tente outro modelo.');
      return;
    }

    if (!response.body) {
      throw new Error('A resposta do servidor não possui corpo de streaming.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullText = '';
    let reasoningText = '';
    let buffer = '';
    let receivedError = false;

    const processLine = (rawLine: string): boolean => {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith(':')) return false;

      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          return true;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            receivedError = true;
            onError(parsed.error);
            return true;
          }

          const r = parsed.reasoning || parsed.choices?.[0]?.delta?.reasoning_content || '';
          const d =
            parsed.delta ||
            parsed.text ||
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.message?.content ||
            '';

          if (r) reasoningText += r;
          if (d) fullText += d;

          if (r || d || parsed.toolCalls) {
            onChunk({
              text: d || '',
              reasoningText: r || '',
              toolCalls: parsed.toolCalls,
            });
          }
        } catch {
          if (dataStr && !dataStr.startsWith('{')) {
            fullText += dataStr;
            onChunk({ text: dataStr });
          }
        }
      } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.error) {
            receivedError = true;
            onError(parsed.error);
            return true;
          }
          const d = parsed.text || parsed.delta || parsed.choices?.[0]?.message?.content || '';
          if (d) {
            fullText += d;
            onChunk({ text: d });
          }
        } catch {
          // ignore
        }
      }
      return false;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (processLine(line)) {
          if (receivedError) return;
          if (fullText.trim() || reasoningText.trim()) {
            onFinish(fullText, reasoningText);
            return;
          }
        }
      }
    }

    if (buffer.trim()) {
      processLine(buffer);
      if (receivedError) return;
    }

    // Fallback: if SSE stream closed without yielding any text (common when CDN/Netlify buffers or cuts stream),
    // automatically retry once with non-streaming JSON mode (`stream: false`).
    if (!fullText.trim() && !reasoningText.trim()) {
      const retryRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, stream: false }),
        signal,
      });

      const retryCt = (retryRes.headers.get('content-type') || '').toLowerCase();
      if (retryRes.ok && retryCt.includes('application/json')) {
        const json: any = await retryRes.json().catch(() => ({}));
        if (json?.error) {
          onError(String(json.error));
          return;
        }
        const txt = String(json?.text || json?.delta || json?.reply || '');
        const reason = String(json?.reasoning || '');
        if (txt.trim() || reason.trim()) {
          onChunk({ text: txt, reasoningText: reason });
          onFinish(txt, reason);
          return;
        }
      }

      onError(
        'Não foi recebida nenhuma resposta do modelo (stream vazio). Verifique sua chave nas Configurações (⚙️) ou troque para outro modelo.'
      );
      return;
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
