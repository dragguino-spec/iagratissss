import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Paperclip, 
  Mic, 
  Sparkles, 
  ChevronDown, 
  Sliders, 
  Square, 
  Boxes 
} from 'lucide-react';
import { MODELS } from '../constants/models';
import { ModelInfo, SkillPlugin, ReasoningEffortLevel } from '../types';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
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
        <div className="relative bg-neutral-50 dark:bg-[#282826] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl p-3 shadow-md focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem ou solicite um Artefato (HTML, React, SVG, Código)..."
              rows={2}
              className="w-full bg-transparent border-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm focus:outline-none resize-none font-sans"
            />

            {/* Toolbar Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50 dark:border-neutral-700/40">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  title="Anexar arquivo ou imagem"
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
                    disabled={!input.trim()}
                    className={`p-2 rounded-xl transition-all ${
                      input.trim()
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
