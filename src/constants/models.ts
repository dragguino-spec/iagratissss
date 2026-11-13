import { ModelInfo, ProviderConfig } from '../types';

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'included',
    name: 'Modelos Prontos (Included)',
    description: 'Modelos gratuitos pré-configurados e ultrarrápidos (Mercury 3, GPT 5 Mini, GPT 4.1 Nano) sem necessidade de chave de API',
    defaultModel: 'mercury-3',
    requiresKey: false,
    docUrl: 'https://aistudio.google.com/',
  },
  {
    id: 'ashna',
    name: 'Ashna AI',
    description: 'Conecte sua própria chave da app.ashna.ai para acessar GLM-5.3 Flash, Kimi K3.1 Pro, DeepSeek V4, Ashna-X1 e seus agentes personalizados',
    defaultModel: 'glm-5.3-flash',
    requiresKey: true,
    baseUrl: 'https://api.ashna.ai/v1/api',
    docUrl: 'https://app.ashna.ai/',
  },
  {
    id: 'xkiro',
    name: 'xKiro AI',
    description: 'Acesse dezenas de modelos gratuitos avançados (SenseNova 6.8, Codestral, Devstral, Mistral Large, Command A, etc.) via chave da xKiro',
    defaultModel: 'sensenova/sensenova-6.8-flash-lite',
    requiresKey: true,
    baseUrl: 'https://api.xkiro.com/v1',
    docUrl: 'https://xkiro.com/',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    description: 'Inferência ultra-rápida em LPU com modelos gratuitos (Llama 3.3 70B, GPT-OSS 120B, GPT-OSS 20B, Qwen 3.8 27B)',
    defaultModel: 'llama-3.3-70b-versatile',
    requiresKey: true,
    baseUrl: 'https://api.groq.com/openai/v1',
    docUrl: 'https://console.groq.com/',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google AI Studio & Gemini API (Gemini 4 Hydrogen, Gemini 3.1 Flash Lite)',
    defaultModel: 'gemini-4-hydrogen',
    requiresKey: true,
    docUrl: 'https://aistudio.google.com/',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Modelos de raciocínio de alta fidelidade (Claude 3.5 Sonnet, Haiku, Opus)',
    defaultModel: 'claude-3-5-sonnet-20241022',
    requiresKey: true,
    docUrl: 'https://console.anthropic.com/',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Provedor líder de IA (GPT-4o, GPT-4o-mini, o3-mini)',
    defaultModel: 'gpt-4o',
    requiresKey: true,
    docUrl: 'https://platform.openai.com/',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Roteador universal para centenas de modelos abertos e proprietários',
    defaultModel: 'openrouter/auto',
    requiresKey: true,
    docUrl: 'https://openrouter.ai/',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Execute modelos de IA localmente no seu computador',
    defaultModel: 'llama3:latest',
    requiresKey: false,
    baseUrl: 'http://localhost:11434',
    docUrl: 'https://ollama.com/',
  },
];

export const MODELS: ModelInfo[] = [
  // --- MODELOS PRONTOS / INCLUDED (100% GRATUITOS E PRÉ-CONFIGURADOS) ---
  {
    id: 'mercury-3',
    name: 'Mercury 3',
    provider: 'included',
    description: 'Raciocínio ágil, alta inteligência e geração de Artifacts com zero configuração',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: 'INCLUDED',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT 5 Mini',
    provider: 'included',
    description: 'Respostas rápidas, concisas e precisas para tarefas gerais e código',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: 'INCLUDED',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT 4.1 Nano',
    provider: 'included',
    description: 'Modelo ultra-leve de latência instantânea pronto para uso imediato',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: 'INCLUDED',
  },

  // --- ASHNA AI MODELS (app.ashna.ai - sincronizado ao vivo com sua chave) ---
  {
    id: 'ashna-x1',
    name: 'Ashna-X1 (Orquestrador)',
    provider: 'ashna',
    description: 'Camada de orquestração nativa da Ashna AI para raciocínio e roteamento multi-modelo',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra (Ashna AI)',
    provider: 'ashna',
    description: 'Modelo avançado de raciocínio e engenharia da linha GPT-6 via Ashna AI',
    contextWindow: 256000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gpt-6-sol',
    name: 'GPT-6 Sol (Ashna AI)',
    provider: 'ashna',
    description: 'Variante equilibrada de alta velocidade da família GPT-6 via Ashna AI',
    contextWindow: 256000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gpt-6-luna',
    name: 'GPT-6 Luna (Ashna AI)',
    provider: 'ashna',
    description: 'Variante leve e rápida da família GPT-6 via Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gpt-6.1-terra',
    name: 'GPT-6.1 Terra (Ashna AI)',
    provider: 'ashna',
    description: 'Edição GPT-6.1 Terra para tarefas agênticas e código via Ashna AI',
    contextWindow: 256000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini (Ashna AI)',
    provider: 'ashna',
    description: 'OpenAI GPT-4o Mini roteado pela sua conta da Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'ASHNA API',
  },
  {
    id: 'claude-fable-5.2',
    name: 'Claude Fable 5.2 (Ashna AI)',
    provider: 'ashna',
    description: 'Anthropic Claude Fable 5.2 de longo horizonte via Ashna AI',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'claude-fable-5.1',
    name: 'Claude Fable 5.1 (Ashna AI)',
    provider: 'ashna',
    description: 'Anthropic Claude Fable 5.1 para codificação e análise via Ashna AI',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet (Ashna AI)',
    provider: 'ashna',
    description: 'Anthropic Claude Sonnet via gateway da Ashna AI',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'claude-opus-4',
    name: 'Claude Opus (Ashna AI)',
    provider: 'ashna',
    description: 'Anthropic Claude Opus de máxima capacidade via Ashna AI',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini Pro (Ashna AI)',
    provider: 'ashna',
    description: 'Google Gemini Pro roteado via Ashna AI',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini Flash (Ashna AI)',
    provider: 'ashna',
    description: 'Google Gemini Flash de baixa latência via Ashna AI',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'ASHNA API',
  },
  {
    id: 'glm-5.3-flash',
    name: 'GLM-5.3 Flash (Ashna AI)',
    provider: 'ashna',
    description: 'Modelo ágil e econômico da família GLM via sua chave da Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'ASHNA API',
  },
  {
    id: 'glm-5.3',
    name: 'GLM-5.3 (Ashna AI)',
    provider: 'ashna',
    description: 'Modelo estruturado avançado para código e tarefas agênticas na Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'kimi-k3.1-pro',
    name: 'Kimi K3.1 Pro (Ashna AI)',
    provider: 'ashna',
    description: 'Contexto massivo e raciocínio profundo Moonshot Kimi via Ashna AI',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash (Ashna AI)',
    provider: 'ashna',
    description: 'Execução veloz de código e lógica via Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'deepseek-v4',
    name: 'DeepSeek V4 (Ashna AI)',
    provider: 'ashna',
    description: 'Modelo principal DeepSeek V4 de alta capacidade via Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'ASHNA API',
  },
  {
    id: 'ashna/custom',
    name: 'Modelo / Agente Personalizado (Ashna AI)',
    provider: 'ashna',
    description: 'Usa o ID exato do modelo ou agente configurado nas Configurações da Ashna AI',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'CUSTOM',
  },

  // --- XKIRO AI MODELS (exact API vendor prefixes) ---
  {
    id: 'qwen/qwen3.8-max',
    name: 'Qwen3.8 Max (xKiro)',
    provider: 'xkiro',
    description: 'Modelo topo de linha com raciocínio de ponta e cota gratuita de 30.0M tokens na xKiro',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.7-max',
    name: 'Qwen3.7 Max (xKiro)',
    provider: 'xkiro',
    description: 'Excelente para codificação, síntese arquitetural e geração de Artifacts',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.7-plus',
    name: 'Qwen3.7 Plus (xKiro)',
    provider: 'xkiro',
    description: 'Equilíbrio ideal entre alta velocidade de resposta e raciocínio profundo',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.5-omni-plus',
    name: 'Qwen3.5 Omni Plus (xKiro)',
    provider: 'xkiro',
    description: 'Capacidade omni multimodal com raciocínio avançado',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.5-397b-a17b',
    name: 'Qwen3.5 397B A17B (xKiro)',
    provider: 'xkiro',
    description: 'Arquitetura MoE massiva de 397 bilhões de parâmetros para tarefas complexas',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3-max',
    name: 'Qwen3 Max (xKiro)',
    provider: 'xkiro',
    description: 'Modelo de referência de alta inteligência da família Qwen3',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.8-omni-flash',
    name: 'Qwen3.8 Omni Flash (xKiro)',
    provider: 'xkiro',
    description: 'Versão ultra-rápida com baixa latência para respostas instantâneas',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.6-max-preview',
    name: 'Qwen3.6 Max Preview (xKiro)',
    provider: 'xkiro',
    description: 'Prévia de alto desempenho da geração Qwen3.6',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'sensenova/sensenova-6.8-flash-lite',
    name: 'SenseNova 6.8 Flash-Lite (xKiro)',
    provider: 'xkiro',
    description: 'Modelo veloz SenseNova com cota gratuita de 15.0M tokens na xKiro',
    contextWindow: 64000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '15.0M FREE',
  },
  {
    id: 'qwen/qwen3.5-plus',
    name: 'Qwen3.5 Plus (xKiro)',
    provider: 'xkiro',
    description: 'Modelo estável e eficiente para chats diários e assistência de programação',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'qwen/qwen3.6-35b-a3b',
    name: 'Qwen3.6 35B A3B (xKiro)',
    provider: 'xkiro',
    description: 'Modelo MoE ágil e eficiente para raciocínio e matemática',
    contextWindow: 64000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '30.0M FREE',
  },
  {
    id: 'mistralai/codestral-2508',
    name: 'Codestral (xKiro Free)',
    provider: 'xkiro',
    description: 'Especialista em código de alta performance, geração de Artifacts e refatoração gratuito na xKiro',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: 'FREE CODE',
  },
  {
    id: 'mistralai/devstral-medium',
    name: 'Devstral 2 (xKiro Free)',
    provider: 'xkiro',
    description: 'Modelo de desenvolvimento avançado e raciocínio técnico gratuito na xKiro',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: 'FREE DEV',
  },
  {
    id: 'mistralai/mistral-large-2512',
    name: 'Mistral Large 3 (xKiro Free)',
    provider: 'xkiro',
    description: 'Modelo topo de linha Frontier com alta capacidade multilíngue gratuito na xKiro',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: 'FREE LARGE',
  },
  {
    id: 'cohere/command-a-reasoning',
    name: 'Command A Reasoning (xKiro Free)',
    provider: 'xkiro',
    description: 'Raciocínio analítico avançado e sintetização estruturada gratuito na xKiro',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: 'FREE REASON',
  },

  // --- GROQ MODELS (exact Groq API catalog identifiers) ---
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile (Groq)',
    provider: 'groq',
    description: 'Modelo carro-chefe de 70B com máxima inteligência garantida em todas as chaves Groq gratuitas',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '128K FREE',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant (Groq)',
    provider: 'groq',
    description: 'Inferência ultraveloz a ~800 tokens/segundo no Groq LPU',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '800 T/S',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Groq)',
    provider: 'groq',
    description: 'Modelo aberto de 120B de parâmetros rodando em velocidade ultra-rápida no Groq LPU',
    contextWindow: 131072,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: '131K CTX',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (Groq)',
    provider: 'groq',
    description: 'Rápido, equilibrado e com ampla janela de contexto de 131k tokens',
    contextWindow: 131072,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '131K CTX',
  },
  {
    id: 'openai/gpt-oss-safeguard-20b',
    name: 'GPT-OSS Safeguard 20B (Groq)',
    provider: 'groq',
    description: 'Modelo de 20B com proteções e moderação avançada',
    contextWindow: 131072,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isIncludedFree: true,
    badge: '131K CTX',
  },
  {
    id: 'allam-2-7b',
    name: 'ALLaM 2 7B (Groq)',
    provider: 'groq',
    description: 'Modelo bilíngue compacto e super ágil no Groq',
    contextWindow: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    isIncludedFree: true,
    badge: '4K CTX',
  },
  {
    id: 'meta-llama/llama-prompt-guard-2-22m',
    name: 'Llama Prompt Guard 2 22M (Groq)',
    provider: 'groq',
    description: 'Classificador e analisador de segurança ultra leve de 22M de parâmetros',
    contextWindow: 512,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    isIncludedFree: true,
    badge: 'SECURITY',
  },
  {
    id: 'meta-llama/llama-prompt-guard-2-86m',
    name: 'Llama Prompt Guard 2 86M (Groq)',
    provider: 'groq',
    description: 'Detector de jailbreak e validação de prompts de 86M de parâmetros',
    contextWindow: 512,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    isIncludedFree: true,
    badge: 'SECURITY',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen3.8 27B (Groq)',
    provider: 'groq',
    description: 'Modelo Frontier de 27B com janela massiva de 262K tokens e velocidade de LPU',
    contextWindow: 262144,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    isIncludedFree: true,
    badge: '262K CTX',
  },

  // --- GOOGLE GEMINI NATIVE MODELS ---
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Flash)',
    provider: 'gemini',
    description: 'Modelo principal Gemini 4 para raciocínio rápido, código e Artifacts (1M tokens)',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
    badge: 'GEMINI 4',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    description: 'Modelo ultra-leve e de baixíssima latência para respostas instantâneas',
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    badge: 'LITE',
  },

  // --- ANTHROPIC CLAUDE NATIVE ---
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'O padrão ouro para código, escrita e suporte a Artifacts',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Modelo ultrarrápido com excelente capacidade de acompanhamento',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Análise profunda e raciocínio conceitual',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },

  // --- OPENAI NATIVE ---
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Modelo multimodal de alta velocidade e precisão',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Compacto, ágil e econômico',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    description: 'Especialista em matemática, lógica e código técnico',
    contextWindow: 200000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
  },

  // --- OPENROUTER ---
  {
    id: 'openrouter/auto',
    name: 'Auto Router',
    provider: 'openrouter',
    description: 'Roteamento inteligente para o melhor modelo disponível',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (OpenRouter)',
    provider: 'openrouter',
    description: 'Modelo de raciocínio de código aberto completo',
    contextWindow: 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: true,
  },

  // --- OLLAMA LOCAL ---
  {
    id: 'llama3:latest',
    name: 'Llama 3 (Local)',
    provider: 'ollama',
    description: 'Servidor local Ollama no seu computador',
    contextWindow: 8192,
    supportsStreaming: true,
    supportsFunctionCalling: false,
  },
  {
    id: 'qwen2.5-coder:latest',
    name: 'Qwen 2.5 Coder (Local)',
    provider: 'ollama',
    description: 'Modelo de código local via Ollama',
    contextWindow: 32768,
    supportsStreaming: true,
    supportsFunctionCalling: false,
  },
];

export const SYSTEM_PRESETS = [
  {
    id: 'claude_default',
    name: 'Assistente Claude & Artifacts',
    description: 'Estilo padrão do Claude com suporte completo a Artifacts (código, React, HTML, SVG, Markdown)',
    icon: 'Sparkles',
    prompt: `Você é um Assistente de Inteligência Artificial avançado, prestativo e amigável, inspirado no Claude com suporte nativo a Artifacts.
Sua missão é ajudar o usuário com respostas claras, código limpo em TypeScript/React/Tailwind e análises profundas.

IMPORTANTE SOBRE ARTIFACTS:
Quando o usuário pedir para você gerar um componente React, uma página HTML, um desenho SVG, um documento Markdown detalhado ou um projeto de código completo (com mais de 15 linhas):
Sempre crie um ARTIFACT usando a sintaxe apropriada:

\`\`\`html
<!-- para páginas web com HTML e Tailwind CSS via CDN -->
\`\`\`

\`\`\`tsx
// para componentes React funcionais com Tailwind CSS e Lucide icons
\`\`\`

\`\`\`svg
<!-- para ilustração ou gráfico vetorial -->
\`\`\`

\`\`\`markdown
# Título do Documento
\`\`\`

Regras para Artifacts React:
1. Use React funcional com hooks.
2. Use Tailwind CSS para estilização elegante.
3. Importe ícones da biblioteca 'lucide-react' se necessário.
4. Garanta que a exportação principal seja 'export default function App()'.
5. Torne as interfaces altamente utilizáveis e bonitas sem elementos visuais genéricos.
`
  },
  {
    id: 'fullstack_architect',
    name: 'Arquiteto de Sistemas Full-Stack',
    description: 'Especialista em arquitetura de software, padrões de projeto e código limpo',
    icon: 'Code',
    prompt: `Você é um Arquiteto de Software Senior e Engenheiro de IA especialista. Foque em fornecer soluções limpas, modulares, com máxima segurança, tratamento de erros e tipagem estrita TypeScript. Ao gerar código, forneça explicações concisas da arquitetura antes dos blocos de código e use Artifacts para os arquivos principais.`
  },
  {
    id: 'creative_writer',
    name: 'Redator Criativo & Copywriter',
    description: 'Redação perspicaz, artigos elegantes, histórias e cópias de marketing',
    icon: 'Feather',
    prompt: `Você é um redator criativo com vocabulário rico, estilo envolvente e capacidade de adaptação de tom. Forneça textos cativantes, revisões impecáveis e documentos em formato Markdown formatados como Artifacts quando apropriado.`
  },
  {
    id: 'data_analyst',
    name: 'Cientista e Analista de Dados',
    description: 'Análise quantitativa, visualização de dados, estatística e Python',
    icon: 'BarChart2',
    prompt: `Você é um Cientista de Dados especialista. Forneça análises quantitativas detalhadas, scripts em Python para tratamento de dados, tabelas claras e dashboards interativos React/SVG.`
  }
];

export function mapAshnaDetailedToModelInfo(raw: {
  id: string;
  name?: string;
  description?: string;
  contextWindow?: number;
  isReasoning?: boolean;
  badge?: string;
}): ModelInfo {
  const displayName = raw.name && raw.name !== raw.id ? raw.name : raw.id;
  return {
    id: raw.id,
    name: displayName.includes('Ashna') ? displayName : `${displayName} (Ashna AI)`,
    provider: 'ashna',
    description: raw.description || `ID: ${raw.id} via sua conta Ashna AI`,
    contextWindow: raw.contextWindow || 128000,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    isReasoningModel: raw.isReasoning,
    badge: raw.badge || 'LIVE ASHNA',
  };
}

export function getAllModels(ashnaDiscoveredModels?: ModelInfo[]): ModelInfo[] {
  if (!ashnaDiscoveredModels || ashnaDiscoveredModels.length === 0) {
    return MODELS;
  }

  const nonAshna = MODELS.filter((m) => m.provider !== 'ashna');
  const staticAshna = MODELS.filter((m) => m.provider === 'ashna');
  const discoveredIds = new Set(ashnaDiscoveredModels.map((m) => m.id));

  const mergedAshna: ModelInfo[] = [
    ...ashnaDiscoveredModels,
    ...staticAshna.filter((m) => !discoveredIds.has(m.id)),
  ];

  const included = nonAshna.filter((m) => m.provider === 'included');
  const others = nonAshna.filter((m) => m.provider !== 'included');
  return [...included, ...mergedAshna, ...others];
}

