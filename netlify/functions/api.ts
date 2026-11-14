import process from 'node:process';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

const serverGeminiKey =
  process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')
    ? process.env.GEMINI_API_KEY
    : '';

function getGenAI(clientKey?: string): GoogleGenAI | null {
  const activeKey = clientKey?.trim() || serverGeminiKey;
  if (!activeKey || activeKey.includes('MY_GEMINI_API_KEY')) return null;
  return new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function buildGeminiConfig(model: string, systemPrompt?: string, reasoningEffort?: string) {
  const isGemini4 = model.startsWith('gemini-4');
  const isHydrogen = model === 'gemini-4-hydrogen';
  const isFlashLite = model === 'gemini-3.1-flash-lite';

  let thinkingLevel: ThinkingLevel = ThinkingLevel.MEDIUM;
  if (reasoningEffort === 'low') {
    thinkingLevel = isFlashLite ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;
  } else if (reasoningEffort === 'medium') {
    thinkingLevel = isFlashLite ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM;
  } else if (reasoningEffort === 'high') {
    thinkingLevel = ThinkingLevel.HIGH;
  } else if (reasoningEffort === 'extra' || reasoningEffort === 'max') {
    thinkingLevel = isHydrogen ? ('XHIGH' as ThinkingLevel) : ThinkingLevel.HIGH;
  }

  if (isGemini4 || isFlashLite) {
    return {
      systemInstruction: systemPrompt || undefined,
      thinkingConfig: { thinkingLevel },
    };
  }

  return {
    systemInstruction: systemPrompt || undefined,
  };
}

function getAshnaBaseUrls(customBase?: string): string[] {
  const clean = (u: string) =>
    u
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/chat\/completions$/i, '')
      .replace(/\/models$/i, '');

  const list = [
    customBase ? clean(customBase) : '',
    'https://api.ashna.ai/v1/api',
    'https://api.ashna.ai/v1',
  ].filter(Boolean);

  return Array.from(new Set(list));
}

function extractAshnaError(raw: string): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.error?.message || parsed?.message || parsed?.detail || raw).slice(0, 180);
  } catch {
    return raw.slice(0, 180);
  }
}

function isAllowedPublicUrl(rawUrl: string): { ok: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'URL inválida.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Apenas URLs http:// ou https:// são permitidas.' };
  }
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:')
  ) {
    return { ok: false, error: 'Acesso a endereços internos/privados bloqueado por segurança.' };
  }
  return { ok: true };
}

function buildTextWithAttachments(content: string, attachments?: any[], maxCharsPerFile = 80000): string {
  const base = String(content || '');
  if (!Array.isArray(attachments) || attachments.length === 0) return base;
  const sections = attachments.map((att, idx) => {
    const sizeMb = typeof att.size === 'number' ? `${(att.size / (1024 * 1024)).toFixed(2)} MB` : '';
    const header = `=== ARQUIVO ANEXADO ${idx + 1}: ${att.name || 'arquivo'} (${att.mimeType || 'application/octet-stream'}${sizeMb ? `, ${sizeMb}` : ''}) ===`;
    const summaryLine = att.summary ? `Resumo: ${att.summary}` : '';
    const body = att.extractedText ? String(att.extractedText).slice(0, maxCharsPerFile) : '';
    return [header, summaryLine, body].filter(Boolean).join('\n');
  });
  return `${base}\n\n[ARQUIVOS ANEXADOS PARA ANÁLISE]:\n${sections.join('\n\n')}`.trim();
}

function buildOpenAiMessagesWithAttachments(
  messages: any[],
  systemPrompt?: string,
  includeVisionImages = true
): Array<{ role: string; content: any }> {
  const out: Array<{ role: string; content: any }> = [];
  if (systemPrompt) out.push({ role: 'system', content: systemPrompt });

  for (const m of messages) {
    const combinedText = buildTextWithAttachments(m.content || '', m.attachments, 55000);
    const images =
      includeVisionImages && Array.isArray(m.attachments)
        ? m.attachments.filter((a: any) => typeof a?.imageDataUrl === 'string' && a.imageDataUrl.startsWith('data:image/'))
        : [];
    if (m.role === 'user' && images.length > 0) {
      const parts: any[] = [{ type: 'text', text: combinedText || 'Analise o(s) arquivo(s) anexado(s).' }];
      images.forEach((img: any) => parts.push({ type: 'image_url', image_url: { url: img.imageDataUrl } }));
      out.push({ role: 'user', content: parts });
    } else {
      out.push({ role: m.role, content: combinedText });
    }
  }
  return out;
}

function buildAnthropicMessagesWithAttachments(
  messages: any[],
  includeVisionImages = true
): Array<{ role: string; content: any }> {
  return messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => {
      const combinedText = buildTextWithAttachments(m.content || '', m.attachments, 60000);
      const images =
        includeVisionImages && Array.isArray(m.attachments)
          ? m.attachments.filter((a: any) => typeof a?.imageDataUrl === 'string' && a.imageDataUrl.startsWith('data:image/'))
          : [];
      if (m.role === 'user' && images.length > 0) {
        const blocks: any[] = [];
        images.forEach((img: any) => {
          const match = String(img.imageDataUrl).match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) blocks.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
        });
        blocks.push({ type: 'text', text: combinedText || 'Analise o(s) arquivo(s) anexado(s).' });
        return { role: 'user', content: blocks };
      }
      return { role: m.role, content: combinedText };
    });
}

function buildGeminiContentsWithAttachments(messages: any[]) {
  return messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => {
      const parts: any[] = [];
      const attachments = Array.isArray(m.attachments) ? m.attachments : [];
      if (m.role === 'user' && attachments.length > 0) {
        for (const att of attachments) {
          if (typeof att.imageDataUrl === 'string' && att.imageDataUrl.startsWith('data:image/')) {
            const match = att.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (match) {
              parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
              continue;
            }
          }
          if (typeof att.inlineBase64 === 'string' && att.inlineBase64.length > 0) {
            parts.push({ inlineData: { mimeType: att.mimeType || 'application/pdf', data: att.inlineBase64 } });
          }
        }
      }
      parts.push({ text: buildTextWithAttachments(m.content || '', attachments, 100000) || 'Analise os arquivos anexados.' });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
}

async function handleAshnaModels(req: Request): Promise<Response> {
  const body: any = await req.json().catch(() => ({}));
  const ashnaKey = String(body?.apiKey || process.env.ASHNA_API_KEY || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .trim();

  if (!ashnaKey) {
    return jsonResponse(
      {
        ok: false,
        error: 'Informe sua chave de API da Ashna AI (app.ashna.ai) para buscar os modelos.',
      },
      400
    );
  }

  const bases = getAshnaBaseUrls(body?.baseUrl);
  let lastError = 'Não foi possível conectar ao servidor da Ashna AI.';

  for (const base of bases) {
    try {
      const mRes = await fetch(`${base}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ashnaKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (mRes.status === 401 || mRes.status === 403) {
        const errBody = await mRes.text().catch(() => '');
        return jsonResponse(
          {
            ok: false,
            error: `Chave de API da Ashna AI inválida, expirada ou sem permissão.${errBody ? ` (${errBody.slice(0, 120)})` : ''}`,
          },
          mRes.status
        );
      }

      if (mRes.ok) {
        const json: any = await mRes.json().catch(() => ({}));
        const rawList: any[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.models)
            ? json.models
            : Array.isArray(json)
              ? json
              : [];

        let rawAgents: any[] = [];
        try {
          const aRes = await fetch(`${base}/agents`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${ashnaKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(2500),
          });
          if (aRes.ok) {
            const aJson: any = await aRes.json().catch(() => ({}));
            rawAgents = Array.isArray(aJson?.data)
              ? aJson.data
              : Array.isArray(aJson?.agents)
                ? aJson.agents
                : Array.isArray(aJson)
                  ? aJson
                  : [];
          }
        } catch {
          // Optional endpoint
        }

        const seenIds = new Set<string>();
        const detailedModels: Array<{
          id: string;
          name: string;
          description?: string;
          contextWindow?: number;
          ownedBy?: string;
          isReasoning?: boolean;
          badge?: string;
        }> = [];

        const pushItem = (item: any, isAgent = false) => {
          const id = typeof item === 'string' ? item : item?.id || item?.model || item?.agent_id || item?.slug;
          if (typeof id !== 'string' || !id.trim() || seenIds.has(id.trim())) return;
          const cleanId = id.trim();
          seenIds.add(cleanId);

          const rawName =
            typeof item === 'object' && item ? item.display_name || item.name || item.title || cleanId : cleanId;
          const ownedBy =
            typeof item === 'object' && item ? item.owned_by || item.provider || item.family : undefined;
          const ctx =
            typeof item === 'object' && item
              ? Number(item.context_length || item.context_window || item.max_tokens || 128000) || 128000
              : 128000;
          const lowerId = cleanId.toLowerCase();
          const isReasoning =
            lowerId.includes('reason') ||
            lowerId.includes('r1') ||
            lowerId.includes('o1') ||
            lowerId.includes('o3') ||
            lowerId.includes('pro') ||
            lowerId.includes('max') ||
            lowerId.includes('opus') ||
            lowerId.includes('sonnet') ||
            lowerId.includes('fable') ||
            lowerId.includes('astra') ||
            lowerId.includes('ashna-x1') ||
            lowerId.includes('deepseek');

          const isAvailable =
            typeof item === 'object' && item
              ? item.available !== false &&
                item.is_available !== false &&
                item.accessible !== false &&
                item.enabled !== false &&
                item.allowed !== false &&
                item.locked !== true &&
                item.requires_upgrade !== true
              : true;

          const tier =
            typeof item === 'object' && item
              ? String(item.access_tier || item.tier || item.plan || '').toLowerCase()
              : '';

          let badge = isAgent ? 'AGENTE' : 'ASHNA API';
          if (!isAgent) {
            if (!isAvailable) badge = 'PLANO PAGO';
            else if (tier === 'free' || tier === 'starter') badge = 'DISPONÍVEL';
          }

          detailedModels.push({
            id: cleanId,
            name: String(rawName),
            description:
              (typeof item === 'object' && item?.description) ||
              (isAgent ? 'Agente personalizado da sua conta Ashna AI' : ownedBy ? `Modelo ${ownedBy} via Ashna AI` : 'Modelo via sua chave Ashna AI'),
            contextWindow: ctx,
            ownedBy: ownedBy ? String(ownedBy) : undefined,
            isReasoning,
            badge,
          });
        };

        rawList.forEach((item) => pushItem(item, item?.type === 'agent' || item?.is_agent === true));
        rawAgents.forEach((item) => pushItem(item, true));

        detailedModels.sort((a, b) => {
          const score = (m: typeof a) => (m.badge === 'AGENTE' ? 0 : m.badge === 'PLANO PAGO' ? 2 : 1);
          return score(a) - score(b);
        });

        return jsonResponse({
          ok: true,
          baseUrl: base,
          models: detailedModels.map((m) => m.id),
          detailedModels,
        });
      }

      const errTxt = await mRes.text().catch(() => '');
      lastError = `Ashna AI retornou HTTP ${mRes.status}${errTxt ? `: ${errTxt.slice(0, 140)}` : ''}`;
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  return jsonResponse({ ok: false, error: lastError }, 502);
}

async function handleChat(req: Request): Promise<Response> {
  const body: any = await req.json().catch(() => ({}));
  const {
    messages = [],
    modelId = 'mercury-3',
    providerId = 'included',
    reasoningEffort = 'medium',
    systemPrompt,
    apiKey,
    xkiroBaseUrl,
    ashnaBaseUrl,
    ashnaCustomModel,
    temperature,
    tools,
    stream: wantStream = true,
  } = body;

  const bufferedText: string[] = [];
  const bufferedReasoning: string[] = [];
  let bufferedError = '';

  const runChatExecution = async (
    writeEvent: (payload: { delta?: string; reasoning?: string; error?: string }) => void,
    finish: () => void
  ) => {
    const pipeOpenAiSse = async (response: globalThis.Response, prefixNotice = ''): Promise<boolean> => {
      let emittedChars = 0;
      const emitDelta = (text: string) => {
        if (!text) return;
        if (emittedChars === 0 && prefixNotice) {
          writeEvent({ delta: prefixNotice });
        }
        emittedChars += text.length;
        writeEvent({ delta: text });
      };

      const ct = (response.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('application/json')) {
        const json: any = await response.json().catch(() => null);
        const text =
          json?.choices?.[0]?.message?.content ||
          json?.choices?.[0]?.text ||
          json?.content?.[0]?.text ||
          json?.reply ||
          json?.output_text ||
          '';
        const reasoning = json?.choices?.[0]?.message?.reasoning_content || json?.choices?.[0]?.message?.reasoning || '';
        if (reasoning) writeEvent({ reasoning: String(reasoning) });
        if (text) {
          emitDelta(String(text));
          finish();
          return true;
        }
        return false;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) {
        return false;
      }

      const processLine = (rawLine: string): 'done' | 'continue' => {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith(':')) return 'continue';

        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            return 'done';
          }
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            const msg = parsed.choices?.[0]?.message;
            if (delta?.reasoning_content || delta?.reasoning) {
              writeEvent({ reasoning: delta.reasoning_content || delta.reasoning });
            } else if (msg?.reasoning_content || msg?.reasoning) {
              writeEvent({ reasoning: msg.reasoning_content || msg.reasoning });
            }
            const chunkText =
              delta?.content ||
              delta?.text ||
              msg?.content ||
              parsed.choices?.[0]?.text ||
              parsed.delta ||
              '';
            if (chunkText) {
              emitDelta(String(chunkText));
            }
          } catch {
            // ignore partial JSON line
          }
          return 'continue';
        }

        // Handle raw non-SSE JSON body even when content-type wasn't application/json
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmed);
            const fallbackText =
              parsed?.choices?.[0]?.message?.content ||
              parsed?.choices?.[0]?.delta?.content ||
              parsed?.content?.[0]?.text ||
              parsed?.reply ||
              '';
            if (fallbackText) {
              emitDelta(String(fallbackText));
            }
          } catch {
            // ignore
          }
        }
        return 'continue';
      };

      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (processLine(line) === 'done') {
              if (emittedChars > 0) {
                finish();
                return true;
              }
              return false;
            }
          }
        }
        if (buffer.trim()) {
          processLine(buffer);
        }
      } catch {
        // ignore stream read termination
      }

      if (emittedChars > 0) {
        finish();
        return true;
      }
      return false;
    };

    const runGeminiContingency = async (opts: {
      prompt?: string;
      notice?: string;
      clientKey?: string;
    }) => {
      if (opts.notice) writeEvent({ delta: `${opts.notice}\n\n` });
      const client = getGenAI(opts.clientKey);
      let lastGeminiErr = '';
      if (client) {
        const contents = buildGeminiContentsWithAttachments(messages);

        for (const gModel of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
          try {
            const gStream = await client.models.generateContentStream({
              model: gModel,
              contents,
              config: buildGeminiConfig(gModel, opts.prompt, reasoningEffort),
            });
            let gChars = 0;
            for await (const chunk of gStream) {
              if (chunk.text) {
                gChars += chunk.text.length;
                writeEvent({ delta: chunk.text });
              }
            }
            if (gChars > 0) {
              finish();
              return;
            }
          } catch (err: any) {
            lastGeminiErr = err?.message || lastGeminiErr;
          }
        }
      }

      const lastUserObj = messages.filter((m: any) => m.role === 'user').pop() || {};
      const hasAttachments = Array.isArray(lastUserObj.attachments) && lastUserObj.attachments.length > 0;
      if (hasAttachments) {
        const summaryList = lastUserObj.attachments
          .map((a: any) => `- **${a.name}** (${a.summary || a.mimeType || 'arquivo'})`)
          .join('\n');
        writeEvent({
          delta:
            `Recebi e processei **${lastUserObj.attachments.length} arquivo(s)** anexado(s):\n\n${summaryList}\n\n` +
            `⚠️ Para que um modelo de IA analise o conteúdo completo, configure uma chave válida em **Configurações (⚙️)** (Ashna AI, xKiro, Groq, Gemini, OpenAI ou Anthropic)` +
            (lastGeminiErr ? ` *(detalhe Gemini: ${lastGeminiErr.slice(0, 120)})*` : '') +
            `.`,
        });
        finish();
        return;
      }

      writeEvent({
        delta:
          `⚠️ Nenhuma chave de API ativa respondeu no momento.\n\n` +
          `Abra **Configurações (⚙️)** e insira sua chave da **Ashna AI**, **xKiro**, **Groq**, **Gemini**, **OpenAI** ou **Anthropic**, ou configure \`GEMINI_API_KEY\` nas variáveis de ambiente do Netlify.` +
          (lastGeminiErr ? `\n\n> Detalhe técnico: \`${lastGeminiErr.slice(0, 160)}\`` : ''),
      });
      finish();
    };

      try {
        let effectiveSystemPrompt = systemPrompt || '';

        const EFFORT_DIRECTIVES: Record<string, string> = {
          low: '\n\n[NÍVEL DE ESFORÇO: BAIXO]\nSeja direto, rápido e conciso. Apresente soluções diretas e código funcional sem introduções ou explicações excessivas.',
          medium: '\n\n[NÍVEL DE ESFORÇO: MÉDIO (RECOMENDADO)]\nForneça respostas equilibradas, completas e bem estruturadas. Analise os aspectos principais e produza artefatos funcionais e de alta qualidade.',
          high: '\n\n[NÍVEL DE ESFORÇO: ALTO]\nAnalise a fundo o problema com raciocínio analítico estruturado passo a passo. Cubra casos de borda, validações, tipagem rigorosa e arquitetura modular limpa.',
          extra: '\n\n[NÍVEL DE ESFORÇO: EXTRA]\nRaciocínio estendido aprofundado. Realize planejamento detalhado antes de gerar a resposta, valide a coerência técnica e entregue artefatos completos e extensivos.',
          max: '\n\n[NÍVEL DE ESFORÇO: MÁXIMO (5x)]\nCapacidade máxima de processamento e raciocínio analítico. Execute verificação minuciosa, avalie múltiplos caminhos técnicos, refine a solução à perfeição e construa código/artefatos exaustivos sem atalhos.',
        };
        effectiveSystemPrompt += EFFORT_DIRECTIVES[reasoningEffort] || EFFORT_DIRECTIVES.medium;

        if (tools && Array.isArray(tools) && tools.length > 0) {
          effectiveSystemPrompt += `\n\n[PLUGINS E HABILIDADES ATIVAS NA SESSÃO]:\n${tools
            .map((t: any) => `- **${t.name}**: ${t.description}`)
            .join('\n')}`;
        }

        // 1. INCLUDED
        if (providerId === 'included' || ['mercury-3', 'gpt-5-mini', 'gpt-4.1-nano'].includes(modelId)) {
          await runGeminiContingency({ prompt: effectiveSystemPrompt, clientKey: apiKey });
          return;
        }

        // 2. ASHNA AI
        if (providerId === 'ashna') {
          const ashnaKey = String(apiKey || process.env.ASHNA_API_KEY || '')
            .trim()
            .replace(/^Bearer\s+/i, '')
            .trim();

          if (!ashnaKey) {
            await runGeminiContingency({
              prompt: effectiveSystemPrompt,
              notice: `> 💡 *Chave da Ashna AI não configurada. Abra **Configurações (⚙️) → Ashna AI** e insira sua chave de [app.ashna.ai](https://app.ashna.ai/).*`,
            });
            return;
          }

          const customModel = String(ashnaCustomModel || '').trim();
          const requestedModel =
            modelId === 'ashna/custom'
              ? customModel || 'glm-5.3-flash'
              : modelId || customModel || 'glm-5.3-flash';

          const formattedMessages = buildOpenAiMessagesWithAttachments(messages, effectiveSystemPrompt, true);
          const formattedTextOnly = buildOpenAiMessagesWithAttachments(messages, effectiveSystemPrompt, false);

          const bases = getAshnaBaseUrls(ashnaBaseUrl);
          const queue = Array.from(
            new Set(
              [
                requestedModel,
                customModel,
                'glm-5.3-flash',
                'ashna-x1',
                'glm-5.3',
                'deepseek-v4.1-flash',
                'kimi-k3.1-pro',
              ].filter(Boolean)
            )
          );
          const triedModels = new Set<string>();
          let activeBases = [...bases];
          let checkedKeyValidity = false;
          let discoveredExtra = false;
          let requestedModelError = '';
          let lastAshnaError = '';

          const tryAshnaAnthropic = async (candidateModel: string): Promise<boolean> => {
            if (!candidateModel.toLowerCase().includes('claude')) return false;
            const anthropicMessages = buildAnthropicMessagesWithAttachments(messages, true);
            const endpoints = Array.from(
              new Set([
                ...bases.map((b) => `${b}/messages`),
                'https://api.ashna.ai/v1/messages',
                'https://api.ashna.ai/v1/api/messages',
              ])
            );
            for (const msgEndpoint of endpoints) {
              try {
                const mRes = await fetch(msgEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ashnaKey,
                    Authorization: `Bearer ${ashnaKey}`,
                    'anthropic-version': '2023-06-01',
                  },
                  body: JSON.stringify({
                    model: candidateModel,
                    system: effectiveSystemPrompt || undefined,
                    messages: anthropicMessages,
                    max_tokens: 4096,
                    stream: false,
                  }),
                  signal: AbortSignal.timeout(12000),
                });
                if (mRes.ok) {
                  const json: any = await mRes.json().catch(() => ({}));
                  const text = json?.content?.[0]?.text || json?.choices?.[0]?.message?.content || json?.reply || '';
                  if (text) {
                    writeEvent({ delta: text });
                    finish();
                    return true;
                  }
                }
              } catch {
                // next endpoint
              }
            }
            return false;
          };

          const ashnaStartMs = Date.now();
          while (queue.length > 0) {
            if (Date.now() - ashnaStartMs > 18000) {
              break;
            }
            const candidateModel = queue.shift()!;
            if (triedModels.has(candidateModel)) continue;
            triedModels.add(candidateModel);

            if (candidateModel === requestedModel && candidateModel.toLowerCase().includes('claude')) {
              const anthOk = await tryAshnaAnthropic(candidateModel);
              if (anthOk) return;
            }

            for (const base of [...activeBases]) {
              if (Date.now() - ashnaStartMs > 18000) break;
              const endpoint = `${base}/chat/completions`;
              const streamModes = candidateModel === requestedModel ? [true, false] : [true];
              for (const useStream of streamModes) {
                if (Date.now() - ashnaStartMs > 18000) break;
                try {
                  let aRes = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${ashnaKey}`,
                    },
                    body: JSON.stringify({
                      model: candidateModel,
                      messages: formattedMessages,
                      stream: useStream,
                      temperature: temperature ?? 0.7,
                    }),
                    signal: AbortSignal.timeout(candidateModel === requestedModel ? 9500 : 5500),
                  });

                  if (!aRes.ok && aRes.status === 400 && formattedMessages.some((m) => Array.isArray(m.content))) {
                    aRes = await fetch(endpoint, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${ashnaKey}`,
                      },
                      body: JSON.stringify({
                        model: candidateModel,
                        messages: formattedTextOnly,
                        stream: useStream,
                        temperature: temperature ?? 0.7,
                      }),
                      signal: AbortSignal.timeout(candidateModel === requestedModel ? 9500 : 5500),
                    });
                  }

                  if (aRes.ok) {
                    const notice =
                      candidateModel !== requestedModel && requestedModelError
                        ? `> ℹ️ *O modelo \`${requestedModel}\` não está liberado na sua conta Ashna AI (${requestedModelError}). Respondendo via **${candidateModel}**:*\n\n`
                        : '';
                    const contentType = aRes.headers.get('content-type') || '';
                    if (!useStream || contentType.includes('application/json')) {
                      const json: any = await aRes.json().catch(() => ({}));
                      const text = json?.choices?.[0]?.message?.content || json?.content || json?.reply || '';
                      if (text) {
                        if (notice) writeEvent({ delta: notice });
                        writeEvent({ delta: text });
                        finish();
                        return;
                      }
                    } else {
                      const piped = await pipeOpenAiSse(aRes, notice);
                      if (piped) return;
                    }
                  }

                  const errBody = await aRes.text().catch(() => '');
                  const parsedMsg = extractAshnaError(errBody) || `HTTP ${aRes.status}`;
                  lastAshnaError = `HTTP ${aRes.status}: ${parsedMsg}`;
                  if (candidateModel === requestedModel && !requestedModelError) {
                    requestedModelError = parsedMsg;
                  }

                  if (aRes.status === 401 && !checkedKeyValidity) {
                    checkedKeyValidity = true;
                    let validBase = '';
                    for (const b of bases) {
                      try {
                        const checkRes = await fetch(`${b}/models`, {
                          headers: { Authorization: `Bearer ${ashnaKey}` },
                          signal: AbortSignal.timeout(3500),
                        });
                        if (checkRes.ok) {
                          validBase = b;
                          break;
                        }
                      } catch {
                        // ignore
                      }
                    }
                    if (!validBase) {
                      writeEvent({
                        error: `Erro Ashna AI (401): Chave de API inválida ou expirada (${parsedMsg}). Verifique sua chave em app.ashna.ai.`,
                      });
                      finish();
                      return;
                    }
                    activeBases = [validBase];
                  }

                  if ((aRes.status === 403 || aRes.status === 404) && !discoveredExtra) {
                    discoveredExtra = true;
                    try {
                      const mRes = await fetch(`${base}/models`, {
                        headers: { Authorization: `Bearer ${ashnaKey}` },
                        signal: AbortSignal.timeout(3500),
                      });
                      if (mRes.ok) {
                        const mJson: any = await mRes.json().catch(() => ({}));
                        const list: any[] = Array.isArray(mJson?.data)
                          ? mJson.data
                          : Array.isArray(mJson?.models)
                            ? mJson.models
                            : [];
                        const liveCandidates = list
                          .filter((item) => {
                            if (!item || typeof item !== 'object') return typeof item === 'string';
                            return (
                              item.available !== false &&
                              item.is_available !== false &&
                              item.accessible !== false &&
                              item.enabled !== false &&
                              item.allowed !== false &&
                              item.locked !== true
                            );
                          })
                          .map((item) => (typeof item === 'string' ? item : item?.id || item?.model))
                          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
                        liveCandidates.slice(0, 8).forEach((id) => {
                          if (!triedModels.has(id) && !queue.includes(id)) queue.push(id);
                        });
                      }
                    } catch {
                      // ignore
                    }
                  }

                  if (
                    (aRes.status === 403 && parsedMsg.toLowerCase().includes('not available')) ||
                    (aRes.status === 404 && !parsedMsg.toLowerCase().includes('model'))
                  ) {
                    break;
                  }
                } catch (err: any) {
                  lastAshnaError = err?.message || 'Erro de conexão com a Ashna AI';
                }
              }
            }
          }

          await runGeminiContingency({
            prompt: effectiveSystemPrompt,
            notice: `> ℹ️ *O modelo \`${requestedModel}\` não está liberado no seu plano da Ashna AI (${requestedModelError || lastAshnaError}). Respondendo via assistente padrão:*`,
          });
          return;
        }

        // 3. XKIRO
        if (providerId === 'xkiro') {
          const xkiroKey = String(apiKey || process.env.XKIRO_API_KEY || '').trim();
          if (xkiroKey) {
            const baseUrl = (xkiroBaseUrl || 'https://api.xkiro.com/v1').replace(/\/$/, '');
            const formattedMessages = buildOpenAiMessagesWithAttachments(messages, effectiveSystemPrompt, true);
            const formattedTextOnly = buildOpenAiMessagesWithAttachments(messages, effectiveSystemPrompt, false);
            const rawModel = String(modelId || 'sensenova/sensenova-6.8-flash-lite');
            const cleanName = rawModel.replace(/^(xkiro|openrouter|qwen)\//, '');
            const candidates = Array.from(
              new Set([
                rawModel,
                cleanName,
                `qwen/${cleanName}`,
                `qwen/${cleanName}:free`,
                'sensenova/sensenova-6.8-flash-lite',
                'mistralai/codestral-2508',
              ])
            );
            for (const candidate of candidates) {
              try {
                let xRes = await fetch(`${baseUrl}/chat/completions`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${xkiroKey}`,
                  },
                  body: JSON.stringify({
                    model: candidate,
                    messages: formattedMessages,
                    stream: true,
                    temperature: temperature ?? 0.7,
                  }),
                  signal: AbortSignal.timeout(7000),
                });
                if (!xRes.ok && xRes.status === 400 && formattedMessages.some((m) => Array.isArray(m.content))) {
                  xRes = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${xkiroKey}`,
                    },
                    body: JSON.stringify({
                      model: candidate,
                      messages: formattedTextOnly,
                      stream: true,
                      temperature: temperature ?? 0.7,
                    }),
                    signal: AbortSignal.timeout(7000),
                  });
                }
                if (xRes.ok) {
                  const piped = await pipeOpenAiSse(xRes);
                  if (piped) return;
                }
                if (xRes.status === 401) break;
              } catch {
                // next candidate
              }
            }
          }
          await runGeminiContingency({ prompt: effectiveSystemPrompt });
          return;
        }

        // 4. GROQ / OPENAI / OPENROUTER
        if (providerId === 'groq' || providerId === 'openai' || providerId === 'openrouter') {
          const envKey =
            providerId === 'groq'
              ? process.env.GROQ_API_KEY
              : providerId === 'openai'
                ? process.env.OPENAI_API_KEY
                : process.env.OPENROUTER_API_KEY;
          const activeKey = String(apiKey || envKey || '').trim();
          if (!activeKey) {
            await runGeminiContingency({
              prompt: effectiveSystemPrompt,
              notice: `> 💡 *Chave da ${providerId.toUpperCase()} não configurada. Respondendo via assistente padrão:*`,
            });
            return;
          }

          const endpoint =
            providerId === 'groq'
              ? 'https://api.groq.com/openai/v1/chat/completions'
              : providerId === 'openai'
                ? 'https://api.openai.com/v1/chat/completions'
                : 'https://openrouter.ai/api/v1/chat/completions';

          const formattedMessages = buildOpenAiMessagesWithAttachments(messages, effectiveSystemPrompt, providerId !== 'groq');

          try {
            const apiRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${activeKey}`,
              },
              body: JSON.stringify({
                model: modelId,
                messages: formattedMessages,
                stream: true,
                temperature: temperature ?? 0.7,
              }),
              signal: AbortSignal.timeout(15000),
            });
            if (apiRes.ok) {
              const piped = await pipeOpenAiSse(apiRes);
              if (piped) return;
            }
          } catch {
            // fallback
          }
          await runGeminiContingency({ prompt: effectiveSystemPrompt });
          return;
        }

        // 5. GOOGLE GEMINI
        if (providerId === 'gemini') {
          const client = getGenAI(apiKey);
          if (!client) {
            await runGeminiContingency({ prompt: effectiveSystemPrompt });
            return;
          }
          const deprecatedAliases = new Set(['gemini-3-flash', 'gemini-3.8-flash', 'gemini-3.8-pro']);
          const normalizedModel = !modelId || deprecatedAliases.has(modelId) ? 'gemini-4-hydrogen' : modelId;
          const contents = buildGeminiContentsWithAttachments(messages);

          for (const mod of Array.from(new Set([normalizedModel, 'gemini-4-hydrogen', 'gemini-3.1-flash-lite']))) {
            try {
              const gStream = await client.models.generateContentStream({
                model: mod,
                contents,
                config: buildGeminiConfig(mod, effectiveSystemPrompt, reasoningEffort),
              });
              for await (const chunk of gStream) {
                if (chunk.text) writeEvent({ delta: chunk.text });
              }
              finish();
              return;
            } catch {
              // next candidate
            }
          }
          await runGeminiContingency({ prompt: effectiveSystemPrompt });
          return;
        }

        // 6. ANTHROPIC
        if (providerId === 'anthropic') {
          const activeKey = String(apiKey || process.env.ANTHROPIC_API_KEY || '').trim();
          if (activeKey) {
            try {
              const anthropicMessages = buildAnthropicMessagesWithAttachments(messages, true);
              const anthRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': activeKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: modelId || 'claude-3-5-sonnet-20241022',
                  system: effectiveSystemPrompt || undefined,
                  messages: anthropicMessages,
                  max_tokens: 4096,
                  stream: false,
                }),
                signal: AbortSignal.timeout(18000),
              });
              if (anthRes.ok) {
                const json: any = await anthRes.json().catch(() => ({}));
                const text = json?.content?.[0]?.text || '';
                if (text) {
                  writeEvent({ delta: text });
                  finish();
                  return;
                }
              }
            } catch {
              // fallback
            }
          }
          await runGeminiContingency({ prompt: effectiveSystemPrompt });
          return;
        }

        await runGeminiContingency({ prompt: effectiveSystemPrompt });
      } catch (err: any) {
        writeEvent({ error: err?.message || 'Erro interno no servidor de IA.' });
        finish();
      }
  };

  if (wantStream === false) {
    await runChatExecution(
      (payload) => {
        if (payload.delta) bufferedText.push(payload.delta);
        if (payload.reasoning) bufferedReasoning.push(payload.reasoning);
        if (payload.error) bufferedError = payload.error;
      },
      () => {}
    );
    if (bufferedError) {
      return jsonResponse({ error: bufferedError }, 500);
    }
    return jsonResponse({
      text: bufferedText.join(''),
      reasoning: bufferedReasoning.join('') || undefined,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const writeEvent = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      };
      await runChatExecution(writeEvent, finish);
      if (!closed) {
        finish();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const routePath = url.pathname.replace(/^\/\.netlify\/functions\/api/, '/api');

  if (req.method === 'GET' && routePath === '/api/health') {
    return jsonResponse({ ok: true, runtime: 'netlify-functions' });
  }

  if (req.method === 'POST' && routePath === '/api/ashna/models') {
    return handleAshnaModels(req);
  }

  if (req.method === 'POST' && routePath === '/api/files/upload-chunk') {
    return jsonResponse({ ok: false, serverless: true }, 501);
  }

  if (req.method === 'DELETE' && routePath.startsWith('/api/files/')) {
    return jsonResponse({ ok: true, serverless: true });
  }

  if (req.method === 'POST' && routePath === '/api/chat') {
    return handleChat(req);
  }

  if (req.method === 'GET' && routePath === '/api/tools/search') {
    const q = url.searchParams.get('q') || '';
    return jsonResponse({
      query: q,
      results: [
        {
          title: `Documentação oficial: ${q}`,
          snippet: `Resumo técnico detalhado e exemplos práticos sobre ${q}.`,
          url: `https://developer.mozilla.org/search?q=${encodeURIComponent(q)}`,
        },
        {
          title: `Repositórios GitHub: ${q}`,
          snippet: `Projetos e bibliotecas relacionados a ${q}.`,
          url: `https://github.com/search?q=${encodeURIComponent(q)}`,
        },
      ],
    });
  }

  if (req.method === 'GET' && routePath === '/api/tools/fetch-url') {
    const targetUrl = (url.searchParams.get('url') || '').trim();
    const check = isAllowedPublicUrl(targetUrl);
    if (!check.ok) {
      return jsonResponse({ url: targetUrl, text: check.error || 'URL bloqueada.' }, 400);
    }
    try {
      const fetchRes = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
      const htmlText = await fetchRes.text();
      const cleanText = htmlText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return jsonResponse({ url: targetUrl, text: cleanText.slice(0, 5000) });
    } catch (err: any) {
      return jsonResponse({ url: targetUrl, text: `Erro ao acessar URL: ${err.message}` });
    }
  }

  return jsonResponse({ error: `Rota não encontrada: ${routePath}` }, 404);
}
