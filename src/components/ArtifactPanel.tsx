import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Eye,
  Code,
  ArrowLeft,
  Layout,
} from 'lucide-react';
import { Artifact } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  allArtifacts?: Artifact[];
  onSelectArtifact?: (id: string) => void;
  onClose: () => void;
  onSelectVersion?: (version: number) => void;
  isMobile?: boolean;
  onBackToChat?: () => void;
}

function prepareReactPreviewCode(rawCode: string): string {
  // 1. Collect named imports from 'lucide-react' before stripping imports
  const lucideBindings: string[] = [];
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(rawCode)) !== null) {
    const specifiers = m[1];
    const source = m[2];
    if (source.includes('lucide-react')) {
      const braceMatch = specifiers.match(/\{([\s\S]*?)\}/);
      if (braceMatch) {
        braceMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((entry) => {
            const aliasMatch = entry.match(/^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/);
            if (aliasMatch) {
              lucideBindings.push(`${aliasMatch[1]}: ${aliasMatch[2]}`);
            } else if (/^[A-Za-z0-9_]+$/.test(entry)) {
              lucideBindings.push(entry);
            }
          });
      }
    }
  }

  // 2. Strip all import statements safely (supports multiline imports & side-effect imports)
  let code = rawCode
    .replace(/import\s+type\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g, '')
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g, '')
    .replace(/import\s+['"][^'"]+['"]\s*;?/g, '');

  // 3. Normalize default export variants to `function App` / `const App`
  if (/export\s+default\s+function\s+[A-Za-z0-9_]+/.test(code)) {
    code = code.replace(/export\s+default\s+function\s+[A-Za-z0-9_]+/, 'function App');
  } else if (/export\s+default\s+function\s*\(/.test(code)) {
    code = code.replace(/export\s+default\s+function\s*\(/, 'function App(');
  } else if (/export\s+default\s+([A-Za-z0-9_]+)\s*;?/.test(code)) {
    const idMatch = code.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/);
    code = code.replace(/export\s+default\s+[A-Za-z0-9_]+\s*;?/g, '');
    if (idMatch && idMatch[1] !== 'App') {
      code += `\nconst App = ${idMatch[1]};`;
    }
  } else {
    code = code.replace(/export\s+default\s+/g, 'const App = ');
  }

  code = code.replace(/export\s+(?=(?:const|let|var|function|class|type|interface|enum)\b)/g, '');

  const lucideHeader =
    lucideBindings.length > 0
      ? `const _FallbackIcon = (props) => React.createElement('span', { className: 'inline-block w-4 h-4' });
const _LucideProxy = new Proxy(_LucideLib, { get: (t, k) => t[k] || _FallbackIcon });
const { ${lucideBindings.join(', ')} } = _LucideProxy;`
      : '';

  return `${lucideHeader}\n${code}`;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  allArtifacts = [],
  onSelectArtifact,
  onClose,
  onSelectVersion,
  isMobile = false,
  onBackToChat,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (artifact) {
      setSelectedVersionNum(artifact.currentVersion);
    }
  }, [artifact?.id, artifact?.currentVersion]);

  if (!artifact) {
    return (
      <div className="flex flex-col bg-neutral-50 dark:bg-[#181816] border-l border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 w-full lg:w-[46vw] xl:w-[42vw] h-full shrink-0 z-30">
        <div className="h-14 px-4 bg-white dark:bg-[#21211f] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {isMobile && onBackToChat && (
              <button
                type="button"
                onClick={onBackToChat}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            )}
            <Layout className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Painel de Artefatos</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-serif text-2xl">
            ❊
          </div>
          <div className="space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {allArtifacts.length > 0 ? 'Selecione um Artefato' : 'Nenhum artefato gerado ainda'}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {allArtifacts.length > 0
                ? 'Escolha um dos artefatos desta conversa abaixo para visualizar ou editar.'
                : 'Peça à IA para criar um componente React, página HTML, gráfico SVG ou documento Markdown e ele aparecerá aqui ao vivo.'}
            </p>
          </div>

          {allArtifacts.length > 0 && (
            <div className="w-full max-w-sm space-y-2 pt-2">
              {allArtifacts.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => onSelectArtifact?.(art.id)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-[#242422] border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-amber-500 text-left transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {art.title}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 capitalize">
                      {art.type} · v{art.currentVersion}
                    </p>
                  </div>
                  <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentVersion =
    artifact.versions.find((v) => v.version === selectedVersionNum) ||
    artifact.versions[artifact.versions.length - 1];
  const content = currentVersion?.content || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      html: 'html',
      react: 'tsx',
      svg: 'svg',
      markdown: 'md',
      code: artifact.language || 'txt',
      mermaid: 'mmd',
    };
    const ext = extMap[artifact.type] || 'txt';
    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${selectedVersionNum}.${ext}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateIframeSrcDoc = () => {
    if (artifact.type === 'html') {
      if (content.includes('<html')) return content;
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-slate-900 p-4 font-sans">
  ${content}
</body>
</html>`;
    }

    if (artifact.type === 'react') {
      const preparedCode = prepareReactPreviewCode(content);

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <style>
    body { margin: 0; background-color: transparent; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__showPreviewError = function(title, err) {
      var root = document.getElementById('root');
      if (!root) return;
      var msg = (err && (err.message || String(err))) || 'Erro desconhecido';
      root.innerHTML = '<div style="margin:20px;padding:16px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-family:monospace;font-size:12px;white-space:pre-wrap;">'
        + '<strong>' + title + '</strong>\\n\\n' + msg.replace(/</g, '&lt;') + '</div>';
    };
    window.addEventListener('error', function(e) {
      window.__showPreviewError('Erro de execução no componente React:', e.error || e.message);
    });
  </script>
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext, Fragment } = React;
    const _LucideLib = window.lucideReact || window.LucideReact || window.lucide || {};

    class _PreviewErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { error: null }; }
      static getDerivedStateFromError(error) { return { error }; }
      render() {
        if (this.state.error) {
          return (
            <div className="m-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono whitespace-pre-wrap">
              <strong>Erro de renderização:</strong>{'\\n'}{this.state.error.message || String(this.state.error)}
            </div>
          );
        }
        return this.props.children;
      }
    }

    ${preparedCode}

    try {
      if (typeof App !== 'undefined') {
        ReactDOM.createRoot(document.getElementById('root')).render(
          <_PreviewErrorBoundary><App /></_PreviewErrorBoundary>
        );
      } else {
        window.__showPreviewError('Componente não encontrado', 'Certifique-se de exportar um componente principal com "export default function App()".');
      }
    } catch (err) {
      window.__showPreviewError('Erro ao montar componente React:', err);
    }
  </script>
</body>
</html>`;
    }

    if (artifact.type === 'svg') {
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#141413;">
  ${content}
</body>
</html>`;
    }

    return '';
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-[#181816] border-l border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-200 transition-all duration-300 z-30 ${
        isFullscreen ? 'fixed inset-0 z-50 w-full h-full' : 'w-full lg:w-[50vw] xl:w-[45vw] h-full shrink-0'
      }`}
    >
      {/* Artifact Panel Top Navigation Bar */}
      <div className="h-14 px-3 sm:px-4 bg-neutral-50 dark:bg-[#21211f] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {isMobile && onBackToChat && (
            <button
              type="button"
              onClick={onBackToChat}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Voltar ao chat"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
          )}

          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0 font-serif">
            ❊
          </div>
          <div className="min-w-0">
            {allArtifacts.length > 1 && onSelectArtifact ? (
              <select
                value={artifact.id}
                onChange={(e) => onSelectArtifact(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[160px] sm:max-w-[220px] focus:outline-none cursor-pointer"
              >
                {allArtifacts.map((art) => (
                  <option key={art.id} value={art.id} className="bg-white dark:bg-[#21211f]">
                    {art.title}
                  </option>
                ))}
              </select>
            ) : (
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {artifact.title}
              </h3>
            )}
            <span className="block text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 capitalize">
              {artifact.type} · v{selectedVersionNum}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center p-0.5 bg-neutral-200/70 dark:bg-[#161615] rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-[#2b2b28] text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Visualização</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                viewMode === 'code'
                  ? 'bg-white dark:bg-[#2b2b28] text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Código</span>
            </button>
          </div>

          {artifact.versions.length > 1 && (
            <select
              value={selectedVersionNum}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSelectedVersionNum(v);
                onSelectVersion?.(v);
              }}
              className="bg-white dark:bg-[#161615] border border-neutral-200 dark:border-neutral-800 rounded-md text-xs text-neutral-700 dark:text-neutral-300 px-2 py-1 focus:outline-none"
            >
              {artifact.versions.map((v) => (
                <option key={v.version} value={v.version}>
                  Versão {v.version} ({new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Baixar arquivo de artefato"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Copiar conteúdo"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden sm:block p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Sair do modo tela cheia' : 'Modo tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-neutral-100 dark:bg-[#121211] overflow-hidden relative">
        {viewMode === 'preview' && (artifact.type === 'html' || artifact.type === 'react' || artifact.type === 'svg') ? (
          <iframe
            key={`iframe-${artifact.id}-v${selectedVersionNum}`}
            srcDoc={generateIframeSrcDoc()}
            className="w-full h-full border-none bg-white dark:bg-neutral-900"
            title={artifact.title}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
          />
        ) : viewMode === 'preview' && artifact.type === 'markdown' ? (
          <div className="p-6 overflow-y-auto h-full max-w-none text-sm text-neutral-800 dark:text-neutral-200 font-sans leading-relaxed bg-white dark:bg-[#141413]">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 bg-neutral-100 dark:bg-[#1a1a18] border-b border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
              <span>
                Extensão: .{artifact.type === 'react' ? 'tsx' : artifact.type === 'html' ? 'html' : artifact.type}
              </span>
              <span>{content.split('\n').length} linhas</span>
            </div>
            <pre className="flex-1 p-4 overflow-auto font-mono-code text-xs leading-relaxed text-emerald-700 dark:text-emerald-300 bg-neutral-50 dark:bg-[#0f0f0e]">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
