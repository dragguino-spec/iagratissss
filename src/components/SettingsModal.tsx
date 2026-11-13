import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Sliders, 
  Cpu, 
  Server, 
  Check, 
  Globe, 
  Save, 
  Info,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { UserSettings, ProviderId } from '../types';
import { PROVIDERS, SYSTEM_PRESETS, mapAshnaDetailedToModelInfo } from '../constants/models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'apikeys' | 'system' | 'context'>('apikeys');
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [ashnaTesting, setAshnaTesting] = useState(false);
  const [ashnaModels, setAshnaModels] = useState<string[]>([]);
  const [ashnaTestStatus, setAshnaTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setAshnaTestStatus(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTestAshnaModels = async () => {
    const key = (localSettings.apiKeys.ashna || '').trim();
    if (!key) {
      setAshnaTestStatus({
        type: 'error',
        message: 'Insira sua chave da Ashna AI (app.ashna.ai) antes de testar.',
      });
      return;
    }

    setAshnaTesting(true);
    setAshnaTestStatus(null);
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/ashna/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          baseUrl: localSettings.ashnaBaseUrl || 'https://api.ashna.ai/v1/api',
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        const isHtml = rawText.trim().startsWith('<');
        setAshnaTestStatus({
          type: 'error',
          message: isHtml
            ? 'O servidor /api/ashna/models retornou HTML em vez de JSON. Se estiver no Netlify, publique o projeto completo (incluindo netlify.toml e netlify/functions/api.ts) via Git ou Netlify CLI.'
            : `Resposta inválida do servidor (HTTP ${res.status}).`,
        });
        setAshnaModels([]);
        return;
      }

      if (!res.ok || !data?.ok) {
        setAshnaTestStatus({
          type: 'error',
          message: data?.error || 'Não foi possível validar sua chave da Ashna AI.',
        });
        setAshnaModels([]);
      } else {
        const list: string[] = Array.isArray(data.models) ? data.models : [];
        const detailed = Array.isArray(data.detailedModels)
          ? data.detailedModels.map((m: any) => mapAshnaDetailedToModelInfo(m))
          : list.map((id) => mapAshnaDetailedToModelInfo({ id }));

        setAshnaModels(list);
        setLocalSettings((prev) => ({
          ...prev,
          ashnaBaseUrl: data.baseUrl || prev.ashnaBaseUrl,
          ashnaDiscoveredModels: detailed,
        }));
        setAshnaTestStatus({
          type: 'success',
          message: list.length > 0
            ? `Conectado! ${list.length} modelo(s)/agente(s) sincronizado(s) e prontos para aparecer no seletor de modelos ao salvar.`
            : 'Chave válida e conectada à Ashna AI!',
        });
      }
    } catch (err: any) {
      setAshnaTestStatus({
        type: 'error',
        message: err?.message || 'Erro de conexão ao testar Ashna AI.',
      });
    } finally {
      setAshnaTesting(false);
    }
  };

  const handleKeyChange = (provider: ProviderId, key: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: key,
      },
    }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#212120] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-serif">
              ❊
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Configurações & Provedores de IA
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Gerencie chaves de API, servidor Ollama local, orçamentos de token e instruções do sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#1a1a19] px-6 shrink-0">
          <button
            onClick={() => setActiveTab('apikeys')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'apikeys'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Chaves de API & Provedores</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Instrução do Sistema (System Prompt)</span>
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'context'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Orçamento de Tokens & Contexto</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'apikeys' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Configure suas próprias chaves de API para os provedores desejados. Para a <strong>Ashna AI</strong>, gere e cole sua chave de <a href="https://app.ashna.ai/" target="_blank" rel="noreferrer" className="underline font-semibold">app.ashna.ai</a>. Você também pode configurar <strong>xKiro AI</strong>, <strong>Groq</strong>, <strong>Gemini</strong>, <strong>Anthropic</strong>, <strong>OpenAI</strong> ou <strong>OpenRouter</strong>.
                </span>
              </div>

              {PROVIDERS.filter((p) => p.id !== 'included').map((provider) => (
                <div
                  key={provider.id}
                  className="p-4 bg-[#282826] border border-neutral-700/60 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                        {provider.name}
                        {localSettings.apiKeys[provider.id] && (
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> CHAVE ATIVA
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-400">{provider.description}</p>
                    </div>

                    <a
                      href={provider.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      Obter Chave <Globe className="w-3 h-3" />
                    </a>
                  </div>

                  {provider.id === 'ollama' ? (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-300">URL do Servidor Ollama</label>
                      <input
                        type="text"
                        value={localSettings.ollamaBaseUrl}
                        onChange={(e) => setLocalSettings({ ...localSettings, ollamaBaseUrl: e.target.value })}
                        placeholder="http://localhost:11434"
                        className="w-full px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : provider.id === 'ashna' ? (
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-300">Sua Chave de API (Ashna AI)</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={localSettings.apiKeys.ashna || ''}
                            onChange={(e) => handleKeyChange('ashna', e.target.value)}
                            placeholder="Cole aqui sua chave da app.ashna.ai"
                            className="flex-1 px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={handleTestAshnaModels}
                            disabled={ashnaTesting}
                            className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${ashnaTesting ? 'animate-spin' : ''}`} />
                            <span>{ashnaTesting ? 'Buscando...' : 'Buscar Modelos'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-400">Endpoint Base da API Ashna AI</label>
                          <input
                            type="text"
                            value={localSettings.ashnaBaseUrl ?? 'https://api.ashna.ai/v1/api'}
                            onChange={(e) => setLocalSettings({ ...localSettings, ashnaBaseUrl: e.target.value })}
                            placeholder="https://api.ashna.ai/v1/api"
                            className="w-full px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-[11px] text-neutral-300 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-400">Modelo ou Agente Personalizado (Opcional)</label>
                          <input
                            type="text"
                            value={localSettings.ashnaCustomModel || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, ashnaCustomModel: e.target.value })}
                            placeholder="Ex: glm-5.3-flash ou ID do agente"
                            className="w-full px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-[11px] text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {ashnaTestStatus && (
                        <div
                          className={`p-2 rounded-lg text-[11px] flex items-start gap-1.5 border ${
                            ashnaTestStatus.type === 'success'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-red-500/10 border-red-500/30 text-red-300'
                          }`}
                        >
                          {ashnaTestStatus.type === 'success' ? (
                            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          )}
                          <span>{ashnaTestStatus.message}</span>
                        </div>
                      )}

                      {ashnaModels.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Modelos / Agentes detectados (clique para preencher personalizado):
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {ashnaModels.map((mId) => (
                              <button
                                key={mId}
                                type="button"
                                onClick={() => setLocalSettings({ ...localSettings, ashnaCustomModel: mId })}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                                  localSettings.ashnaCustomModel === mId
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                    : 'bg-[#1a1a19] border-neutral-700 text-neutral-300 hover:border-amber-500/50'
                                }`}
                              >
                                {mId}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : provider.id === 'xkiro' ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-300">Chave de API (xKiro AI)</label>
                        <input
                          type="password"
                          value={localSettings.apiKeys.xkiro || ''}
                          onChange={(e) => handleKeyChange('xkiro', e.target.value)}
                          placeholder="Insira sua chave de API da xKiro (ex: xk-...)"
                          className="w-full px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-400">Endpoint Base da API xKiro</label>
                        <input
                          type="text"
                          value={localSettings.xkiroBaseUrl || 'https://api.xkiro.com/v1'}
                          onChange={(e) => setLocalSettings({ ...localSettings, xkiroBaseUrl: e.target.value })}
                          placeholder="https://api.xkiro.com/v1"
                          className="w-full px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-xs text-neutral-300 font-mono focus:outline-none focus:border-amber-500 text-[11px]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-300">Chave de API ({provider.name})</label>
                      <input
                        type="password"
                        value={localSettings.apiKeys[provider.id] || ''}
                        onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                        placeholder={`sk-... ou ${provider.id}_key`}
                        className="w-full px-3 py-1.5 bg-[#1a1a19] border border-neutral-700 rounded-lg text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-4">
              {/* Nome da Conta */}
              <div className="space-y-1.5 p-3.5 bg-[#282826] border border-neutral-700/60 rounded-xl">
                <label className="block text-xs font-semibold text-neutral-200">
                  Nome da sua Conta (Perfil):
                </label>
                <input
                  type="text"
                  value={localSettings.userName || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, userName: e.target.value })}
                  placeholder="Ex: Pedro Lucas"
                  className="w-full px-3 py-2 bg-[#1a1a19] border border-neutral-700 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-medium"
                />
                <p className="text-[11px] text-neutral-400">
                  Este nome é exibido no seu avatar, nas saudações e no histórico de conversas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Selecione um Preset de Personalização:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SYSTEM_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, customSystemPrompt: preset.prompt })}
                      className="p-3 bg-[#282826] hover:bg-[#323230] border border-neutral-700/60 rounded-xl text-left transition-colors space-y-1"
                    >
                      <h5 className="text-xs font-bold text-amber-400">{preset.name}</h5>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-300">
                  Instrução Personalizada do Sistema (System Prompt)
                </label>
                <textarea
                  value={localSettings.customSystemPrompt}
                  onChange={(e) => setLocalSettings({ ...localSettings, customSystemPrompt: e.target.value })}
                  rows={6}
                  className="w-full p-3 bg-[#1a1a19] border border-neutral-700 rounded-xl text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Orçamento Máximo de Tokens por Chat:</span>
                  <span className="font-mono text-amber-400">{localSettings.maxContextTokens.toLocaleString()} tokens</span>
                </div>
                <input
                  type="range"
                  min={16000}
                  max={1000000}
                  step={16000}
                  value={localSettings.maxContextTokens}
                  onChange={(e) => setLocalSettings({ ...localSettings, maxContextTokens: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#282826] border border-neutral-700/60 rounded-xl">
                <div>
                  <h5 className="text-xs font-bold text-neutral-100">Compressão Automática de Histórico</h5>
                  <p className="text-[11px] text-neutral-400">Resume ou remove mensagens antigas quando o limite estiver próximo</p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.autoTruncate}
                  onChange={(e) => setLocalSettings({ ...localSettings, autoTruncate: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>

              {/* Nível de Esforço Padrão */}
              <div className="p-3 bg-[#282826] border border-neutral-700/60 rounded-xl space-y-2">
                <div>
                  <h5 className="text-xs font-bold text-neutral-100">Nível de Esforço Padrão da IA</h5>
                  <p className="text-[11px] text-neutral-400">
                    Mais esforço significa respostas mais completas, mas leva mais tempo e consome seus limites mais rápido.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                  {(['low', 'medium', 'high', 'extra', 'max'] as const).map((lvl) => {
                    const labels = {
                      low: 'Baixo',
                      medium: 'Médio',
                      high: 'Alto',
                      extra: 'Extra',
                      max: 'Máx',
                    };
                    const isSelected = (localSettings.reasoningEffort || 'medium') === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, reasoningEffort: lvl })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                            : 'bg-[#1f1f1d] text-neutral-300 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        {labels[lvl]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-[#1a1a19] border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#d97757] hover:bg-[#c66444] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Salvo!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
