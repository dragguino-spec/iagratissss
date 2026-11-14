import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  PenTool,
  BookOpen,
  Code2,
  Heart,
  Zap,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react';

import { ChatAttachment, ModelInfo, ProviderId, ReasoningEffortLevel } from '../types';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { useFileAttachments } from '../hooks/useFileAttachments';
import { useVoiceDictation } from '../hooks/useVoiceDictation';
import { AttachmentTray } from './AttachmentTray';
import { MODELS } from '../constants/models';

interface ClaudeWelcomeProps {
  onSendMessage: (text: string, attachments?: ChatAttachment[]) => void;
  selectedModelName: string;
  selectedModelId?: string;
  selectedProviderId?: ProviderId;
  models?: ModelInfo[];
  onSelectModel?: (modelId: string, providerId: ProviderId) => void;
  onOpenSettings?: () => void;
  reasoningEffort?: ReasoningEffortLevel;
  onSelectReasoningEffort?: (level: ReasoningEffortLevel) => void;
  onSelectPromptCategory?: (category: string) => void;
  userName?: string;
}

export const ClaudeWelcome: React.FC<ClaudeWelcomeProps> = ({
  onSendMessage,
  selectedModelName,
  selectedModelId,
  selectedProviderId,
  models = MODELS,
  onSelectModel,
  onOpenSettings,
  reasoningEffort = 'medium',
  onSelectReasoningEffort,
  userName,
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'cowork'>('chat');
  const [isQuickModelOpen, setIsQuickModelOpen] = useState(false);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  const {
    attachments,
    isDragging,
    isUploadingAny,
    readyAttachments,
    fileInputRef,
    removeAttachment,
    clearAttachments,
    openFilePicker,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
  } = useFileAttachments();

  const { isListening, voiceError, toggleVoiceInput } = useVoiceDictation({
    onTranscript: (spoken) => {
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
    },
  });

  useEffect(() => {
    if (!isQuickModelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setIsQuickModelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isQuickModelOpen]);

  const canSend = (Boolean(input.trim()) || readyAttachments.length > 0) && !isUploadingAny;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    const rawText = input.trim() || `Analise o(s) ${readyAttachments.length} arquivo(s) anexado(s).`;
    const textToSend =
      mode === 'cowork' && input.trim()
        ? `[Modo Cowork · Colaboração Passo a Passo] ${rawText}`
        : rawText;
    onSendMessage(textToSend, readyAttachments.length > 0 ? readyAttachments : undefined);
    setInput('');
    clearAttachments();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const promptSuggestions = [
    { label: 'Escrever', icon: PenTool, prompt: 'Ajude-me a escrever um artigo técnico sobre arquitetura de software limpa.' },
    { label: 'Aprender', icon: BookOpen, prompt: 'Explique como funciona o algoritmo de raciocínio do DeepSeek V4 de forma intuitiva.' },
    { label: 'Programar', icon: Code2, prompt: 'Crie uma aplicação web interativa em React e Tailwind CSS com gráficos dinâmicos.' },
    { label: 'Vida pessoal', icon: Heart, prompt: 'Crie um plano semanal estruturado para gerenciar projetos pessoais e produtividade.' },
    { label: 'Escolha do Claude', icon: Zap, prompt: 'Crie um dashboard completo em React para visualização de métricas de IA com mapa vetorial SVG.' },
  ];

  const displayName = userName && userName.trim() !== 'Usuário' ? userName.trim().split(' ')[0] : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-3xl mx-auto w-full min-h-[calc(100vh-3.5rem)] text-center overflow-y-auto">
      {/* Central Seriffed Heading */}
      <div className="mb-8 space-y-3 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-neutral-800 dark:text-neutral-100">
          <span className="font-serif text-3xl md:text-4xl text-[#d97757] dark:text-[#e07a5f]">❊</span>
          <h1 className="font-serif-claude text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight">
            {displayName ? `O que vamos pensar juntos, ${displayName}?` : 'O que vamos pensar juntos?'}
          </h1>
        </div>
      </div>

      {/* Main Input Box Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full bg-white dark:bg-[#2b2b28] border rounded-2xl shadow-xl p-3 md:p-4 text-left transition-all hover:shadow-2xl ${
          isDragging
            ? 'border-[#d97757] ring-2 ring-[#d97757]/30'
            : 'border-neutral-200 dark:border-neutral-700/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {isDragging && (
          <div className="mb-2 py-2 px-3 rounded-xl bg-[#d97757]/10 border border-dashed border-[#d97757] text-xs font-medium text-[#d97757] text-center">
            Solte aqui qualquer arquivo (até 500 MB) para a IA analisar
          </div>
        )}

        {voiceError && (
          <div className="mb-2 py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-600 dark:text-red-400">
            {voiceError}
          </div>
        )}

        <AttachmentTray attachments={attachments} onRemove={removeAttachment} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              mode === 'cowork'
                ? 'Descreva a tarefa para planejarmos e executarmos juntos passo a passo...'
                : displayName
                  ? `Como posso ajudar você hoje, ${displayName}? (Aceita qualquer arquivo até 500 MB)`
                  : 'Como posso ajudar você hoje? (Aceita qualquer arquivo até 500 MB)'
            }
            rows={3}
            className="w-full bg-transparent border-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm md:text-base focus:outline-none resize-none font-sans"
          />

          {/* Bottom Bar inside Input Card */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/50 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Attachment Plus button */}
              <button
                type="button"
                onClick={openFilePicker}
                className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 rounded-lg transition-colors cursor-pointer"
                title="Anexar qualquer arquivo (até 500 MB)"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Mode Toggle (Chat / Cowork) */}
              <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-[#21211f] rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode('chat')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    mode === 'chat'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setMode('cowork')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    mode === 'cowork'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Cowork
                </button>
              </div>

              {/* Selected Model Quick Dropdown */}
              <div className="relative hidden sm:block" ref={modelPickerRef}>
                <button
                  type="button"
                  onClick={() => setIsQuickModelOpen((prev) => !prev)}
                  className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 font-medium px-2.5 py-1 bg-neutral-100 dark:bg-[#21211f] border border-transparent hover:border-amber-500/60 rounded-lg transition-colors cursor-pointer"
                  title="Selecionar modelo de IA"
                >
                  <span className="max-w-[180px] truncate">{selectedModelName}</span>
                  <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isQuickModelOpen ? 'rotate-180' : ''}`} />
                </button>

                {isQuickModelOpen && (
                  <div className="absolute bottom-full mb-2 left-0 w-72 max-h-72 bg-white dark:bg-[#212120] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                    <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-56">
                      {models.map((m) => {
                        const isSelected = m.id === selectedModelId && (!selectedProviderId || m.provider === selectedProviderId);
                        return (
                          <button
                            key={`${m.provider}-${m.id}`}
                            type="button"
                            onClick={() => {
                              onSelectModel?.(m.id, m.provider);
                              setIsQuickModelOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate">{m.name}</div>
                              <div className="text-[10px] text-neutral-400 uppercase">{m.provider}</div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickModelOpen(false);
                          onOpenSettings();
                        }}
                        className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1a1a19] text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configurar Chaves de API...</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Esforço de Raciocínio */}
              {onSelectReasoningEffort && (
                <ReasoningEffortSelector
                  value={reasoningEffort}
                  onChange={onSelectReasoningEffort}
                  variant="toolbar-button"
                  direction="up"
                />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mic Icon */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-red-500/15 text-red-500 animate-pulse'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                }`}
                title={isListening ? 'Parar ditado por voz' : 'Entrada por voz'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Submit Arrow Button */}
              <button
                type="submit"
                disabled={!canSend}
                title={isUploadingAny ? 'Aguarde o processamento/envio do arquivo...' : 'Enviar'}
                className={`p-2 rounded-xl transition-colors ${
                  canSend
                    ? 'bg-[#d97757] text-white hover:bg-[#c66444] shadow-md cursor-pointer'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Suggestion Pills underneath input */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
        {promptSuggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInput(item.prompt);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#21211f] dark:hover:bg-[#2b2b28] text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors border border-neutral-200/60 dark:border-neutral-700/50 cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-[#d97757]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
