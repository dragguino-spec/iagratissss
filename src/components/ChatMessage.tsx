import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Brain, 
  ExternalLink, 
  Code, 
  Sparkles, 
  Wrench, 
  RotateCw,
  FileText,
  Layout,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import { Artifact, ChatMessage as ChatMessageType } from '../types';
import { AttachmentKindIcon } from './AttachmentTray';
import { formatFileSize } from '../services/fileProcessor';

interface ChatMessageProps {
  message: ChatMessageType;
  artifacts: Record<string, Artifact>;
  onOpenArtifact: (id: string) => void;
  onRegenerate?: () => void;
  userName?: string;
  userAvatarColor?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  artifacts,
  onOpenArtifact,
  onRegenerate,
  userName = 'Você',
  userAvatarColor = 'bg-[#d97757]',
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);

  const isUser = message.role === 'user';

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Find associated artifacts
  const associatedArtifacts = Object.values(artifacts).filter((art) =>
    message.artifactIds?.includes(art.id) || message.content.includes(art.id) || message.content.includes(art.title)
  );

  const userInitial = userName && userName.trim() ? userName.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div className={`py-6 px-4 md:px-8 border-b border-neutral-100 dark:border-neutral-800/40 ${
      isUser ? 'bg-transparent' : 'bg-neutral-50/50 dark:bg-[#1f1f1d]'
    }`}>
      <div className="max-w-3xl mx-auto flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className={`w-8 h-8 rounded-full ${userAvatarColor} text-white font-semibold text-xs flex items-center justify-center shadow-xs font-serif`}>
              {userInitial}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#d97757]/15 dark:bg-[#e07a5f]/20 border border-[#d97757]/30 text-[#d97757] dark:text-[#e07a5f] font-serif font-bold text-sm flex items-center justify-center">
              ❊
            </div>
          )}
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header Metadata */}
          <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                {isUser ? userName : 'Claude'}
              </span>
              {message.modelUsed && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[11px] text-neutral-500">{message.modelUsed}</span>
                </>
              )}
            </div>

            <span className="text-[11px]">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Reasoning / Thinking Box for DeepSeek, O3, Kimi Thinking */}
          {message.reasoningContent && (
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl overflow-hidden text-xs">
              <button
                onClick={() => setIsReasoningOpen(!isReasoningOpen)}
                className="w-full px-3 py-2 flex items-center justify-between text-purple-700 dark:text-purple-300 font-medium hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                  <span>Processo de Raciocínio Interno</span>
                </div>
                {isReasoningOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isReasoningOpen && (
                <div className="p-3 bg-purple-100/30 dark:bg-purple-950/40 border-t border-purple-200 dark:border-purple-800/30 font-mono text-[11px] text-purple-900 dark:text-purple-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {message.reasoningContent}
                </div>
              )}
            </div>
          )}

          {/* Tool Execution Logs */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="space-y-1.5">
              {message.toolCalls.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-lg text-xs font-mono text-indigo-700 dark:text-indigo-300"
                >
                  <Wrench className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Ferramenta: <strong className="font-semibold">{tool.toolName}</strong>({JSON.stringify(tool.arguments)})</span>
                  {tool.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                </div>
              ))}
            </div>
          )}

          {/* Attached Files in Sent Message */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 bg-white dark:bg-[#282826] border border-neutral-200 dark:border-neutral-700/80 rounded-xl shadow-xs max-w-[260px]"
                >
                  {att.kind === 'image' && att.imageDataUrl ? (
                    <img
                      src={att.imageDataUrl}
                      alt={att.name}
                      className="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      <AttachmentKindIcon kind={att.kind} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-100 truncate" title={att.name}>
                      {att.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                      {att.summary || formatFileSize(att.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Render Main Content text and code blocks */}
          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-sans space-y-3">
            {renderFormattedMessage(message.content, handleCopyCode, copiedCodeIndex, onOpenArtifact)}
          </div>

          {/* Artifact Cards (If message generated artifacts) */}
          {associatedArtifacts.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Artefatos Gerados
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {associatedArtifacts.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => onOpenArtifact(art.id)}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-[#282826] border border-neutral-200 dark:border-neutral-700/80 rounded-xl hover:border-amber-500 dark:hover:border-amber-500/60 transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {art.type === 'react' || art.type === 'html' ? (
                        <Layout className="w-5 h-5" />
                      ) : art.type === 'svg' ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <FileCode className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {art.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 capitalize truncate mt-0.5">
                        {art.type} · v{art.currentVersion}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Message Actions */}
          <div className="flex items-center justify-between pt-1 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                title="Copiar texto da mensagem"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Copiado' : 'Copiar'}</span>
              </button>

              {!isUser && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  title="Gerar resposta novamente"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Refazer</span>
                </button>
              )}
            </div>

            {message.tokensUsed && (
              <span className="font-mono text-[10px] text-neutral-400">
                {message.tokensUsed.total} tokens
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Formats message text into clean Markdown paragraphs and code blocks
function renderFormattedMessage(
  content: string,
  onCopyCode: (code: string, idx: number) => void,
  copiedCodeIndex: number | null,
  onOpenArtifact: (id: string) => void
) {
  // Hide raw <antArtifact> tags from text view since they're rendered as artifact cards
  const cleanContent = content.replace(/<antArtifact[\s\S]*?<\/antArtifact>/gi, '[Artefato gerado e disponível no painel ao lado]');

  const parts = cleanContent.split(/(```[\s\S]*?```)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('```')) {
      const match = part.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
      const language = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);

      return (
        <div key={idx} className="my-3 rounded-xl overflow-hidden border border-neutral-800 bg-[#141413] text-neutral-200 shadow-md">
          {/* Code Header */}
          <div className="px-4 py-2 bg-[#1a1a19] border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span className="font-semibold capitalize text-amber-500">{language || 'código'}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopyCode(code, idx)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCodeIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar código</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Code Body */}
          <pre className="p-4 overflow-x-auto text-xs font-mono-code leading-relaxed text-emerald-300">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Regular Markdown paragraph rendering
    return (
      <div key={idx} className="whitespace-pre-wrap">
        {part}
      </div>
    );
  });
}
