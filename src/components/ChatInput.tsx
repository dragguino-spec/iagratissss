import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Paperclip, 
  ChevronDown, 
  Square, 
  Boxes 
} from 'lucide-react';
import { MODELS } from '../constants/models';
import { ChatAttachment, ModelInfo, SkillPlugin, ReasoningEffortLevel } from '../types';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { useFileAttachments } from '../hooks/useFileAttachments';
import { AttachmentTray } from './AttachmentTray';

interface ChatInputProps {
  onSendMessage: (text: string, attachments?: ChatAttachment[]) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  models?: ModelInfo[];
  reasoningEffort?: ReasoningEffortLevel;
  onSelectReasoningEffort?: (level: ReasoningEffortLevel) => void;
  activeSkills: SkillPlugin[];
  onOpenSkills: () => void;
  onOpenSettings: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  selectedModelId,
  onSelectModel,
  models = MODELS,
  reasoningEffort = 'medium',
  onSelectReasoningEffort,
  activeSkills,
  onOpenSkills,
  onOpenSettings,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const canSend = (Boolean(input.trim()) || readyAttachments.length > 0) && !isUploadingAny && !isLoading;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    const textToSend = input.trim() || `Analise o(s) ${readyAttachments.length} arquivo(s) anexado(s).`;
    onSendMessage(textToSend, readyAttachments.length > 0 ? readyAttachments : undefined);
    setInput('');
    clearAttachments();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0];
  const enabledSkillsCount = activeSkills.filter((s) => s.enabled).length;

  return (
    <div className="p-4 bg-white dark:bg-[#1a1a19] border-t border-neutral-200 dark:border-neutral-800/80 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative bg-neutral-50 dark:bg-[#282826] border rounded-2xl p-3 shadow-md transition-all ${
            isDragging
              ? 'border-[#d97757] ring-2 ring-[#d97757]/30 bg-amber-50/30 dark:bg-[#2e2925]'
              : 'border-neutral-200 dark:border-neutral-700/80 focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20'
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
              Solte aqui qualquer arquivo (até 500 MB) para analisar
            </div>
          )}

          <AttachmentTray attachments={attachments} onRemove={removeAttachment} />

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Digite sua mensagem, cole uma imagem ou anexe qualquer arquivo até 500 MB..."
              rows={2}
              className="w-full bg-transparent border-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none resize-none font-sans"
            />

            {/* Toolbar Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50 dark:border-neutral-700/40">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  title="Anexar qualquer arquivo (até 500 MB)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Model Quick Indicator Tag */}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-[#1f1f1d] border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-amber-500 transition-colors"
                >
                  <span className="font-semibold">{currentModel.name}</span>
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>

                {/* Esforço de Raciocínio (Claude Web Toolbar Control) */}
                {onSelectReasoningEffort && (
                  <ReasoningEffortSelector
                    value={reasoningEffort}
                    onChange={onSelectReasoningEffort}
                    variant="toolbar-button"
                    direction="up"
                  />
                )}

                {/* Active Skills Pill */}
                <button
                  type="button"
                  onClick={onOpenSkills}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>{enabledSkillsCount} Skill{enabledSkillsCount !== 1 ? 's' : ''} ativas</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={onStopGeneration}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                    title="Parar geração"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSend}
                    title={isUploadingAny ? 'Aguarde o processamento/envio do arquivo...' : 'Enviar'}
                    className={`p-2 rounded-xl transition-all ${
                      canSend
                        ? 'bg-[#d97757] text-white hover:bg-[#c66444] shadow-md scale-100'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
