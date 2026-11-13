import React, { useState } from 'react';
import { 
  X, 
  Github, 
  Plus, 
  Check, 
  Boxes, 
  Search, 
  ExternalLink, 
  Wrench, 
  Download, 
  Trash2, 
  Code2, 
  Globe, 
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SkillPlugin } from '../types';
import { importSkillFromGitHub } from '../services/skillManager';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: SkillPlugin[];
  onToggleSkill: (id: string) => void;
  onAddSkill: (skill: SkillPlugin) => void;
  onRemoveSkill: (id: string) => void;
}

const POPULAR_PLUGINS = [
  {
    name: 'Superpowers (Claude)',
    repo: 'https://github.com/obra/superpowers',
    desc: '15 Habilidades: TDD, Systematic Debugging, Brainstorming e Planejamento',
  },
  {
    name: 'MCP Official Servers',
    repo: 'https://github.com/modelcontextprotocol/servers',
    desc: 'Protocolo MCP oficial com ferramentas de sistema, filesystem e rede',
  },
  {
    name: 'Subagente Brainstorming',
    repo: 'https://github.com/obra/superpowers/tree/main/skills/brainstorming',
    desc: 'Skill individual de ideação e refinamento socrático',
  },
];

export const SkillsModal: React.FC<SkillsModalProps> = ({
  isOpen,
  onClose,
  skills,
  onToggleSkill,
  onAddSkill,
  onRemoveSkill,
}) => {
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);

  if (!isOpen) return null;

  const runImport = async (url: string) => {
    if (!url.trim()) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const imported = await importSkillFromGitHub(url.trim());
      onAddSkill(imported);
      setImportSuccess(`Plugin "${imported.name}" importado com sucesso! (${imported.tools.length} ferramenta(s) registradas e ativas)`);
      setGithubUrlInput('');
    } catch (err: any) {
      setImportError(err.message || 'Falha ao importar repositório do GitHub.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    await runImport(githubUrlInput);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#212120] border border-neutral-200 dark:border-neutral-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Ecossistema de Skills & Plugins
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Carregue e execute ferramentas do GitHub, Claude Plugins ou MCPs para expandir a IA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GitHub Importer Bar */}
        <div className="p-6 bg-neutral-50 dark:bg-[#1a1a19] border-b border-neutral-200 dark:border-neutral-800 shrink-0 space-y-3">
          <form onSubmit={handleImport} className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Importar Plugins / Skills do GitHub (Claude Plugin, MCP ou SKILL.md)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Github className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Ex: https://github.com/obra/superpowers ou dono/repo"
                  value={githubUrlInput}
                  onChange={(e) => setGithubUrlInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#252523] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isImporting || !githubUrlInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                {isImporting ? <Download className="w-4 h-4 animate-bounce" /> : <Plus className="w-4 h-4" />}
                <span>{isImporting ? 'Importando...' : 'Importar'}</span>
              </button>
            </div>

            {importError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 dark:text-red-400 font-medium">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}
          </form>

          {/* Quick Suggestions */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Plugins Populares Recomendados (1 clique para importar):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_PLUGINS.map((plugin) => (
                <button
                  key={plugin.name}
                  type="button"
                  onClick={() => {
                    setGithubUrlInput(plugin.repo);
                    runImport(plugin.repo);
                  }}
                  disabled={isImporting}
                  className="px-2.5 py-1 bg-white dark:bg-[#252523] border border-neutral-200 dark:border-neutral-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-lg text-left text-xs transition-all hover:shadow-xs group cursor-pointer"
                >
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1">
                    <Github className="w-3 h-3" />
                    {plugin.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skill Cards List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Skills e Plugins Instalados ({skills.length})
            </h3>
            <span className="text-xs text-neutral-400">
              {skills.filter((s) => s.enabled).length} ativados na sessão
            </span>
          </div>

          <div className="space-y-3">
            {skills.map((skill) => {
              const isExpanded = expandedSkillId === skill.id;
              const hasManyTools = skill.tools && skill.tools.length > 4;
              const visibleTools = hasManyTools && !isExpanded ? skill.tools.slice(0, 4) : skill.tools;

              return (
                <div
                  key={skill.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                    skill.enabled
                      ? 'bg-white dark:bg-[#282826] border-indigo-500/50 shadow-xs'
                      : 'bg-neutral-50 dark:bg-[#1a1a19] border-neutral-200 dark:border-neutral-800 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {skill.icon === 'Globe' ? (
                          <Globe className="w-5 h-5" />
                        ) : skill.icon === 'Code2' ? (
                          <Code2 className="w-5 h-5" />
                        ) : (
                          <Github className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            {skill.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded font-mono">
                            v{skill.version || '1.0'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded font-medium">
                            {skill.tools?.length || 0} {skill.tools?.length === 1 ? 'ferramenta' : 'ferramentas'}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    {/* Skill Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onToggleSkill(skill.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          skill.enabled
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {skill.enabled ? 'Ativada' : 'Desativada'}
                      </button>

                      {skill.source !== 'builtin' && (
                        <button
                          onClick={() => onRemoveSkill(skill.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                          title="Remover skill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tools badges */}
                  {skill.tools && skill.tools.length > 0 && (
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {visibleTools.map((t) => (
                          <span
                            key={t.name}
                            title={t.description}
                            className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 rounded-md text-[10px] font-mono flex items-center gap-1 hover:border-indigo-400 transition-colors"
                          >
                            <Wrench className="w-2.5 h-2.5 text-indigo-500" />
                            {t.name}
                          </span>
                        ))}

                        {hasManyTools && (
                          <button
                            type="button"
                            onClick={() => setExpandedSkillId(isExpanded ? null : skill.id)}
                            className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                <span>Menos</span>
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>+{skill.tools.length - 4} mais</span>
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

