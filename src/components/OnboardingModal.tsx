import React, { useState } from 'react';
import { User, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onSaveName: (name: string, color?: string) => void;
}

const AVATAR_COLORS = [
  { name: 'Amber', bg: 'bg-[#d97757]', border: 'border-[#d97757]/40', text: 'text-white' },
  { name: 'Indigo', bg: 'bg-indigo-600', border: 'border-indigo-500/40', text: 'text-white' },
  { name: 'Emerald', bg: 'bg-emerald-600', border: 'border-emerald-500/40', text: 'text-white' },
  { name: 'Purple', bg: 'bg-purple-600', border: 'border-purple-500/40', text: 'text-white' },
  { name: 'Sky', bg: 'bg-sky-600', border: 'border-sky-500/40', text: 'text-white' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onSaveName,
}) => {
  const [name, setName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Por favor, informe seu nome para continuar.');
      return;
    }
    onSaveName(trimmed, AVATAR_COLORS[selectedColorIndex].bg);
  };

  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#212120] border border-neutral-200 dark:border-neutral-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#d97757]/15 dark:bg-[#e07a5f]/20 border border-[#d97757]/30 text-[#d97757] dark:text-[#e07a5f] font-serif font-bold text-2xl flex items-center justify-center shadow-xs">
            ❊
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-serif-claude tracking-tight">
              Bem-vindo ao Claude Web
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
              Como você gostaria de ser chamado durante as conversas e na sua conta?
            </p>
          </div>
        </div>

        {/* Live Preview Avatar */}
        <div className="flex flex-col items-center justify-center mb-6 space-y-3">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold font-serif shadow-lg border-2 transition-transform transform scale-100 ${AVATAR_COLORS[selectedColorIndex].bg} ${AVATAR_COLORS[selectedColorIndex].border} text-white`}
          >
            {initial}
          </div>

          {/* Color Palette Picker */}
          <div className="flex items-center gap-2">
            {AVATAR_COLORS.map((col, index) => (
              <button
                key={col.name}
                type="button"
                onClick={() => setSelectedColorIndex(index)}
                className={`w-6 h-6 rounded-full ${col.bg} transition-all cursor-pointer ${
                  selectedColorIndex === index
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#212120] ring-neutral-900 dark:ring-white scale-110'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                title={`Cor ${col.name}`}
              />
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Nome da sua conta:
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                autoFocus
                placeholder="Ex: Pedro Lucas"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-[#1a1a19] border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/20 transition-all font-medium"
              />
            </div>
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 font-medium pt-1">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#d97757] hover:bg-[#c66444] text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>Começar a Usar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500 mt-4">
          Você poderá alterar seu nome a qualquer momento nas configurações.
        </p>
      </div>
    </div>
  );
};
