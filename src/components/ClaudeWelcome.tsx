import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Mic, 
  ArrowUp, 
  PenTool, 
  BookOpen, 
  Code2, 
  Heart, 
  Zap, 
  ChevronDown 
} from 'lucide-react';

import { ReasoningEffortLevel } from '../types';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';

interface ClaudeWelcomeProps {
  onSendMessage: (text: string) => void;
  selectedModelName: string;
  reasoningEffort?: ReasoningEffortLevel;
  onSelectReasoningEffort?: (level: ReasoningEffortLevel) => void;
  onSelectPromptCategory?: (category: string) => void;
  userName?: string;
}

export const ClaudeWelcome: React.FC<ClaudeWelcomeProps> = ({
  onSendMessage,
  selectedModelName,
  reasoningEffort = 'medium',
  onSelectReasoningEffort,
  userName,
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'cowork'>('chat');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
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
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-3xl mx-auto w-full min-h-[calc(100vh-3.5rem)] text-center">
      {/* Central Seriffed Heading inspired by Claude screenshot */}
      <div className="mb-8 space-y-3 animate-fade-in">
        <div className="flex items-center justify-center gap-3 text-neutral-800 dark:text-neutral-100">
          <span className="font-serif text-3xl md:text-4xl text-[#d97757] dark:text-[#e07a5f]">❊</span>
          <h1 className="font-serif-claude text-3xl md:text-4xl font-normal tracking-tight">
            {displayName ? `O que vamos pensar juntos, ${displayName}?` : 'O que vamos pensar juntos?'}
          </h1>
        </div>
      </div>

      {/* Main Input Box Card */}
      <div className="w-full bg-white dark:bg-[#2b2b28] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl shadow-xl p-3 md:p-4 text-left transition-shadow hover:shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={displayName ? `Como posso ajudar você hoje, ${displayName}?` : 'Como posso ajudar você hoje?'}
            rows={3}
            className="w-full bg-transparent border-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm md:text-base focus:outline-none resize-none font-sans"
          />

          {/* Bottom Bar inside Input Card */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/50">
            <div className="flex items-center gap-2">
              {/* Attachment Plus button */}
              <button
                type="button"
                className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 rounded-lg transition-colors"
                title="Anexar arquivo ou imagem"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Mode Toggle (Chat / Cowork) */}
              <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-[#21211f] rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode('chat')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
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
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    mode === 'cowork'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Cowork
                </button>
              </div>

              {/* Selected Model Tag */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium px-2.5 py-1 bg-neutral-100 dark:bg-[#21211f] rounded-lg">
                <span>{selectedModelName}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </div>

              {/* Esforço de Raciocínio (Claude Web Toolbar Control) */}
              {onSelectReasoningEffort && (
                <ReasoningEffortSelector
                  value={reasoningEffort}
                  onChange={onSelectReasoningEffort}
                  variant="toolbar-button"
                  direction="up"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Mic Icon */}
              <button
                type="button"
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg"
                title="Entrada por voz"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Submit Arrow Button */}
              <button
                type="submit"
                disabled={!input.trim()}
                className={`p-2 rounded-xl transition-colors ${
                  input.trim()
                    ? 'bg-[#d97757] text-white hover:bg-[#c66444] shadow-md'
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
              onClick={() => {
                setInput(item.prompt);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#21211f] dark:hover:bg-[#2b2b28] text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors border border-neutral-200/60 dark:border-neutral-700/50"
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
