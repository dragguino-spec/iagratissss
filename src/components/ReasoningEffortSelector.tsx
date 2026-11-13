import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check, AlertTriangle, Zap, ChevronDown } from 'lucide-react';
import { ReasoningEffortLevel } from '../types';

export interface ReasoningEffortConfig {
  id: ReasoningEffortLevel;
  label: string;
  badge?: string;
  badgeType?: 'recommended' | 'warning';
  thinkingBudget: number;
  description: string;
}

export const EFFORT_LEVELS: ReasoningEffortConfig[] = [
  {
    id: 'low',
    label: 'Baixo',
    thinkingBudget: 1024,
    description: 'Respostas rápidas e concisas, menor consumo de tokens',
  },
  {
    id: 'medium',
    label: 'Médio',
    badge: 'Recomendado',
    badgeType: 'recommended',
    thinkingBudget: 4096,
    description: 'Equilíbrio ideal entre profundidade de raciocínio e velocidade',
  },
  {
    id: 'high',
    label: 'Alto',
    thinkingBudget: 8192,
    description: 'Análise passo a passo aprofundada para código e arquitetura',
  },
  {
    id: 'extra',
    label: 'Extra',
    thinkingBudget: 16384,
    description: 'Raciocínio estendido para problemas complexos e multi-arquivos',
  },
  {
    id: 'max',
    label: 'Máx',
    badge: '5x ou mais de uso',
    badgeType: 'warning',
    thinkingBudget: 32768,
    description: 'Capacidade máxima de processamento com verificação exaustiva',
  },
];

interface ReasoningEffortSelectorProps {
  value: ReasoningEffortLevel;
  onChange: (level: ReasoningEffortLevel) => void;
  variant?: 'menu-item' | 'pill-button' | 'toolbar-button';
  direction?: 'up' | 'down' | 'right';
  className?: string;
}

export const ReasoningEffortSelector: React.FC<ReasoningEffortSelectorProps> = ({
  value = 'medium',
  onChange,
  variant = 'menu-item',
  direction = 'down',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLevel = EFFORT_LEVELS.find((l) => l.id === value) || EFFORT_LEVELS[1];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Position classes based on direction with mobile responsiveness
  const getPopoverPositionClasses = () => {
    switch (direction) {
      case 'up':
        return 'bottom-16 sm:bottom-full sm:mb-2 sm:left-0';
      case 'right':
        return 'bottom-16 sm:bottom-auto sm:left-full sm:ml-1 sm:top-0';
      case 'down':
      default:
        return 'top-16 sm:top-full sm:mt-2 sm:left-0';
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Variant 1: Menu item inside dropdown (Exact match of User's Image 1) */}
      {variant === 'menu-item' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Esforço</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <span>{currentLevel.label}</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}

      {/* Trigger Variant 2: Toolbar button (in ChatInput) */}
      {variant === 'toolbar-button' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-[#1f1f1d] border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-amber-500 transition-colors cursor-pointer shadow-2xs"
          title="Nível de esforço e raciocínio da IA"
        >
          <Zap className="w-3 h-3 text-amber-500" />
          <span className="text-neutral-500 dark:text-neutral-400 hidden xs:inline">Esforço:</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{currentLevel.label}</span>
          <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Trigger Variant 3: Pill button (in Header) */}
      {variant === 'pill-button' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 rounded-lg hover:border-amber-500/70 transition-colors cursor-pointer"
          title="Esforço de Raciocínio da IA"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400">Esforço:</span>
          <span className="font-semibold text-neutral-900 dark:text-white">{currentLevel.label}</span>
          <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Popover / Flyout (Exact match of User's Image 2 with mobile viewport safety) */}
      {isOpen && (
        <div
          className={`fixed sm:absolute z-50 left-4 right-4 sm:left-auto sm:right-auto w-auto sm:w-80 bg-[#2b2b29] text-white border border-neutral-700/80 rounded-2xl shadow-2xl p-2.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${getPopoverPositionClasses()}`}
        >
          {/* Header Explanation */}
          <div className="px-2 py-1.5 mb-2 text-xs text-neutral-300/90 leading-relaxed font-normal">
            Mais esforço significa respostas mais completas, mas leva mais tempo e consome seus limites mais rápido.
          </div>

          {/* Options List */}
          <div className="space-y-0.5">
            {EFFORT_LEVELS.map((level) => {
              const isSelected = level.id === value;

              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    onChange(level.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-neutral-700/60 text-white font-medium'
                      : 'hover:bg-neutral-700/40 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{level.label}</span>

                    {/* Badge: Recomendado */}
                    {level.badgeType === 'recommended' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-neutral-300 border border-neutral-600 rounded-full tracking-wide">
                        {level.badge}
                      </span>
                    )}

                    {/* Badge: Máx ⚠️ 5x ou mais de uso */}
                    {level.badgeType === 'warning' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-amber-300/95 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{level.badge}</span>
                      </span>
                    )}
                  </div>

                  {/* Selected checkmark (blue icon matching Claude Web screenshot) */}
                  {isSelected && (
                    <Check className="w-4 h-4 text-sky-400 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
