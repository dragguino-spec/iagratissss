import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  Layout, 
  Settings, 
  Sliders, 
  Cpu, 
  Check, 
  Boxes,
  Zap,
  Search,
  RefreshCw,
  Key
} from 'lucide-react';
import { MODELS, PROVIDERS } from '../constants/models';
import { ModelInfo, ProviderId, ReasoningEffortLevel } from '../types';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';

interface HeaderProps {
  selectedModel: string;
  selectedProvider: ProviderId;
  onSelectModel: (modelId: string, providerId: ProviderId) => void;
  models?: ModelInfo[];
  hasAshnaKey?: boolean;
  ashnaCustomModel?: string;
  isRefreshingAshna?: boolean;
  onRefreshAshnaModels?: () => void;
  reasoningEffort?: ReasoningEffortLevel;
  onSelectReasoningEffort?: (level: ReasoningEffortLevel) => void;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  isArtifactPanelOpen: boolean;
  onToggleArtifactPanel: () => void;
  tokenStats: { totalTokens: number; maxTokens: number };
  artifactCount: number;
  workspaceName?: string;
  isMobile?: boolean;
  activeMobileTab?: 'chat' | 'artifact';
  onSelectMobileTab?: (tab: 'chat' | 'artifact') => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedModel,
  selectedProvider,
  onSelectModel,
  models = MODELS,
  hasAshnaKey = false,
  ashnaCustomModel = '',
  isRefreshingAshna = false,
  onRefreshAshnaModels,
  reasoningEffort = 'medium',
  onSelectReasoningEffort,
  onOpenSettings,
  onOpenSkills,
  isArtifactPanelOpen,
  onToggleArtifactPanel,
  tokenStats,
  artifactCount,
  workspaceName,
  isMobile = false,
  activeMobileTab = 'chat',
  onSelectMobileTab,
}) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [filterProvider, setFilterProvider] = useState<ProviderId | 'all'>('all');
  const [modelSearch, setModelSearch] = useState('');

  const currentModelInfo =
    models.find((m) => m.id === selectedModel && m.provider === selectedProvider) ||
    models.find((m) => m.id === selectedModel) ||
    models[0];
  const currentModelDisplayName =
    selectedModel === 'ashna/custom' && ashnaCustomModel?.trim()
      ? `${ashnaCustomModel.trim()} (Ashna AI)`
      : currentModelInfo.name;
  const currentProviderInfo = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  const filteredModels = (filterProvider === 'all' 
    ? models 
    : models.filter((m) => m.provider === filterProvider)
  ).filter((m) => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  });

  const contextPercent = Math.min(100, Math.round((tokenStats.totalTokens / tokenStats.maxTokens) * 100));

  return (
    <header className="h-14 bg-white dark:bg-[#1a1a19] border-b border-neutral-200 dark:border-neutral-800/80 px-2 sm:px-4 flex items-center justify-between shrink-0 transition-colors z-20 gap-2">
      {/* Zone 1: Model Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700/60 shadow-xs cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-serif text-xs font-bold shrink-0">
            ❊
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[90px] xs:max-w-[140px] sm:max-w-none">
              {currentModelDisplayName}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal hidden md:inline">
              ({currentProviderInfo.name})
            </span>
            {currentModelInfo.badge && (
              <span className="hidden xs:inline px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md uppercase tracking-wider">
                {currentModelInfo.badge}
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5 shrink-0" />
        </button>

        {/* Model Picker Modal Dropdown (Mobile-Safe Width, overflow-visible so Esforço flyout never clips) */}
        {isModelDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsModelDropdownOpen(false)} 
            />
            <div className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-16 sm:top-full mt-1 w-auto sm:w-96 max-h-[80vh] sm:max-h-[500px] bg-white dark:bg-[#212120] border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-40 overflow-visible flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              
              {/* Filter Tabs */}
              <div className="p-2 bg-neutral-50 dark:bg-[#1a1a19] rounded-t-xl flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFilterProvider('all')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                    filterProvider === 'all'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  Todos ({models.length})
                </button>
                {PROVIDERS.map((p) => {
                  const count = models.filter((m) => m.provider === p.id).length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setFilterProvider(p.id)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                        filterProvider === p.id
                          ? 'bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {p.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search & Ashna Live Sync Bar */}
              <div className="p-2 bg-neutral-50/60 dark:bg-[#1d1d1b] flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Buscar modelo por nome ou ID..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#141413] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {(filterProvider === 'ashna' || filterProvider === 'all') && (
                  hasAshnaKey && onRefreshAshnaModels ? (
                    <button
                      type="button"
                      onClick={onRefreshAshnaModels}
                      disabled={isRefreshingAshna}
                      title="Sincronizar todos os modelos da sua conta Ashna AI"
                      className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingAshna ? 'animate-spin' : ''}`} />
                      <span className="hidden xs:inline">{isRefreshingAshna ? 'Sincronizando...' : 'Sincronizar Ashna'}</span>
                    </button>
                  ) : filterProvider === 'ashna' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModelDropdownOpen(false);
                        onOpenSettings();
                      }}
                      className="px-2.5 py-1.5 bg-[#d97757] hover:bg-[#c66444] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Key className="w-3 h-3" />
                      <span>Conectar Chave</span>
                    </button>
                  ) : null
                )}
              </div>

              {/* Model List */}
              <div className="p-2 overflow-y-auto max-h-[340px] space-y-1">
                {filteredModels.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-400">
                    Nenhum modelo encontrado para "{modelSearch}".
                  </div>
                ) : (
                  filteredModels.map((m) => {
                    const isSelected = m.id === selectedModel && m.provider === selectedProvider;
                    return (
                      <button
                        key={`${m.provider}-${m.id}`}
                        onClick={() => {
                          onSelectModel(m.id, m.provider);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start justify-between gap-2 group ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/70 border border-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                              {m.name}
                            </span>
                            {m.badge && (
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-semibold rounded ${
                                  m.badge === 'PLANO PAGO'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {m.badge}
                              </span>
                            )}
                            {m.isReasoningModel && (
                              <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5" /> Raciocínio
                              </span>
                            )}
                          </div>
                          {m.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                              {m.description}
                            </p>
                          )}
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-2">
                            <span>Contexto: {(m.contextWindow / 1000).toFixed(0)}k tokens</span>
                            <span>·</span>
                            <span className="capitalize">{m.provider}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Esforço de Raciocínio (Claude Web Menu Item) */}
              {onSelectReasoningEffort && (
                <div className="p-2 bg-neutral-50 dark:bg-[#1a1a19] rounded-b-xl border-t border-neutral-200/80 dark:border-neutral-800">
                  <ReasoningEffortSelector
                    value={reasoningEffort}
                    onChange={onSelectReasoningEffort}
                    variant="menu-item"
                    direction="right"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Effort Selector in Header Bar */}
      {onSelectReasoningEffort && (
        <div className="hidden sm:block">
          <ReasoningEffortSelector
            value={reasoningEffort}
            onChange={onSelectReasoningEffort}
            variant="pill-button"
            direction="down"
          />
        </div>
      )}

      {/* Zone 2: Workspace & Status or Mobile Tab Switcher */}
      {isMobile && isArtifactPanelOpen ? (
        <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
          <button
            type="button"
            onClick={() => onSelectMobileTab?.('chat')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeMobileTab === 'chat'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onSelectMobileTab?.('artifact')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeMobileTab === 'artifact'
                ? 'bg-[#d97757] text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            <span>Artefato</span>
            {artifactCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                {artifactCount}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          {workspaceName && (
            <span className="font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
              📁 {workspaceName}
            </span>
          )}

          {/* Token Context Indicator */}
          <div 
            className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700/50"
            title={`Uso de contexto: ${tokenStats.totalTokens.toLocaleString()} / ${tokenStats.maxTokens.toLocaleString()} tokens (${contextPercent}%)`}
          >
            <Cpu className="w-3.5 h-3.5 text-neutral-400" />
            <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  contextPercent > 85 ? 'bg-red-500' : contextPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} 
                style={{ width: `${contextPercent}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums font-medium text-neutral-600 dark:text-neutral-300">
              {contextPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onOpenSkills}
          className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700/60 cursor-pointer"
          title="Ecossistema de Skills e Plugins do GitHub"
        >
          <Boxes className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Skills & GitHub</span>
        </button>

        <button
          onClick={onToggleArtifactPanel}
          className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
            isArtifactPanelOpen
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700/60'
          }`}
          title="Alternar Painel de Artefatos"
        >
          <Layout className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Artefatos</span>
          {artifactCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {artifactCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          title="Configurações e Chaves de API"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
