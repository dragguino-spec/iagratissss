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
  History, 
  RefreshCw, 
  ExternalLink,
  Sparkles,
  Layout,
  FileCode,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';
import { Artifact } from '../types';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
  onSelectVersion?: (version: number) => void;
  isMobile?: boolean;
  onBackToChat?: () => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
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
  }, [artifact]);

  if (!artifact) return null;

  const currentVersion = artifact.versions.find((v) => v.version === selectedVersionNum) || artifact.versions[artifact.versions.length - 1];
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

  // Build iframe srcDoc for live rendering of HTML/React
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
      // Clean export statement for Babel standalone component rendering
      let componentCode = content
        .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function App()')
        .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');

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
    body { margin: 0; background-color: transparent; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    
    // Lucide Icons proxy fallback
    const Lucide = window.LucideReact || {};
    
    ${componentCode}

    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    } else {
      document.getElementById('root').innerHTML = '<div style="padding:20px;color:red;">Componente App não encontrado.</div>';
    }
  </script>
</body>
</html>`;
    }

    if (artifact.type === 'svg') {
      return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d0d0d;">
  ${content}
</body>
</html>`;
    }

    return '';
  };

  return (
    <div className={`flex flex-col bg-[#181816] border-l border-neutral-800 text-neutral-200 transition-all duration-300 z-30 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 w-full h-full' 
        : 'w-full lg:w-[50vw] xl:w-[45vw] h-full shrink-0'
    }`}>
      {/* Artifact Panel Top Navigation Bar */}
      <div className="h-14 px-3 sm:px-4 bg-[#21211f] border-b border-neutral-800 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button to return to Chat */}
          {isMobile && onBackToChat && (
            <button
              type="button"
              onClick={onBackToChat}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Voltar ao chat"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
          )}

          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 font-serif">
            ❊
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-neutral-100 truncate">{artifact.title}</h3>
            <span className="text-[10px] sm:text-[11px] text-neutral-400 capitalize">{artifact.type} · v{selectedVersionNum}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Segmented Controls (Preview vs Code) */}
          <div className="flex items-center p-0.5 bg-[#161615] rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium ${
                viewMode === 'preview'
                  ? 'bg-[#2b2b28] text-amber-400 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visualização</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors font-medium ${
                viewMode === 'code'
                  ? 'bg-[#2b2b28] text-amber-400 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Código</span>
            </button>
          </div>

          {/* Version Selector dropdown */}
          {artifact.versions.length > 1 && (
            <select
              value={selectedVersionNum}
              onChange={(e) => setSelectedVersionNum(Number(e.target.value))}
              className="bg-[#161615] border border-neutral-800 rounded-md text-xs text-neutral-300 px-2 py-1 focus:outline-none"
            >
              {artifact.versions.map((v) => (
                <option key={v.version} value={v.version}>
                  Versão {v.version} ({new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
            </select>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Baixar arquivo de artefato"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Copiar conteúdo"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title={isFullscreen ? 'Sair do modo tela cheia' : 'Modo tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Fechar painel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#121211] overflow-hidden relative">
        {viewMode === 'preview' && (artifact.type === 'html' || artifact.type === 'react' || artifact.type === 'svg') ? (
          <iframe
            key={`iframe-v${selectedVersionNum}`}
            srcDoc={generateIframeSrcDoc()}
            className="w-full h-full border-none bg-white dark:bg-neutral-900"
            title={artifact.title}
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
          />
        ) : viewMode === 'preview' && artifact.type === 'markdown' ? (
          <div className="p-6 overflow-y-auto h-full prose prose-invert max-w-none text-sm text-neutral-300 font-sans leading-relaxed">
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        ) : (
          /* Code view */
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 bg-[#1a1a18] border-b border-neutral-800 text-xs font-mono text-neutral-400 flex items-center justify-between">
              <span>Extensão: .{artifact.type === 'react' ? 'tsx' : artifact.type === 'html' ? 'html' : artifact.type}</span>
              <span>{content.split('\n').length} linhas</span>
            </div>
            <pre className="flex-1 p-4 overflow-auto font-mono-code text-xs leading-relaxed text-emerald-300 bg-[#0f0f0e]">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
