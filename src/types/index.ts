export type ProviderId = 
  | 'included'
  | 'ashna'
  | 'xkiro'
  | 'groq'
  | 'gemini'
  | 'anthropic'
  | 'openai'
  | 'openrouter'
  | 'ollama';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  description?: string;
  contextWindow: number; // in tokens
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  isReasoningModel?: boolean;
  isIncludedFree?: boolean;
  badge?: string;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  description: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  requiresKey: boolean;
  docUrl: string;
}

export interface SystemPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

export interface SkillTool {
  name: string;
  description: string;
  parameters: Record<string, SkillParameter>;
  handlerType?: 'client_fetch' | 'server_proxy' | 'code_eval' | 'builtin';
  endpointUrl?: string;
  codeSnippet?: string;
}

export interface SkillPlugin {
  id: string;
  name: string;
  description: string;
  author?: string;
  repoUrl?: string;
  version?: string;
  enabled: boolean;
  tools: SkillTool[];
  icon?: string;
  source: 'github' | 'builtin' | 'custom_mcp' | 'custom_url';
}

export interface ArtifactVersion {
  version: number;
  timestamp: string;
  title: string;
  type: 'html' | 'react' | 'svg' | 'markdown' | 'code' | 'mermaid';
  language?: string;
  content: string;
}

export interface Artifact {
  id: string;
  title: string;
  type: 'html' | 'react' | 'svg' | 'markdown' | 'code' | 'mermaid';
  language?: string;
  currentVersion: number;
  versions: ArtifactVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ToolCallPayload {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'error';
  errorMessage?: string;
}

export type AttachmentKind =
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'text'
  | 'code'
  | 'archive'
  | 'office'
  | 'binary';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKind;
  summary?: string;
  extractedText?: string;
  imageDataUrl?: string;
  inlineBase64?: string;
  uploadId?: string;
  status?: 'processing' | 'uploading' | 'ready' | 'error';
  progress?: number;
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  reasoningContent?: string;
  timestamp: string;
  modelUsed?: string;
  providerUsed?: ProviderId;
  artifactIds?: string[];
  toolCalls?: ToolCallPayload[];
  attachments?: ChatAttachment[];
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  activeSkillIds: string[];
}

export type ReasoningEffortLevel = 'low' | 'medium' | 'high' | 'extra' | 'max';

export interface ChatSession {
  id: string;
  workspaceId?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  selectedModel: string;
  selectedProvider: ProviderId;
  reasoningEffort?: ReasoningEffortLevel;
  systemPrompt?: string;
  activeSkillIds: string[];
  artifacts: Record<string, Artifact>;
}

export interface UserProfile {
  name: string;
  avatarColor?: string;
}

export interface UserSettings {
  userName?: string;
  apiKeys: Record<ProviderId, string>;
  ollamaBaseUrl: string;
  xkiroBaseUrl: string;
  ashnaBaseUrl?: string;
  ashnaCustomModel?: string;
  ashnaDiscoveredModels?: ModelInfo[];
  theme: 'dark' | 'light' | 'system';
  maxContextTokens: number;
  autoTruncate: boolean;
  temperature: number;
  reasoningEffort?: ReasoningEffortLevel;
  customSystemPrompt: string;
  activeWorkspaceId?: string;
  codeRunnerTheme: 'vs-dark' | 'github-light';
}
