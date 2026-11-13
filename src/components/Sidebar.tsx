import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FolderKanban, 
  LayoutGrid, 
  SlidersHorizontal, 
  MessageSquare, 
  Boxes, 
  Sun, 
  Moon, 
  Trash2, 
  Edit3, 
  ChevronRight,
  Sparkles,
  Github,
  Settings,
  HelpCircle,
  X
} from 'lucide-react';
import { ChatSession, ProjectWorkspace } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  workspaces: ProjectWorkspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace: (id?: string) => void;
  onOpenSkills: () => void;
  onOpenSettings: () => void;
  onOpenArtifactsGallery: () => void;
  theme: 'dark' | 'light' | 'system';
  onToggleTheme: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  userName?: string;
  userAvatarColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onOpenSkills,
  onOpenSettings,
  onOpenArtifactsGallery,
  theme,
  onToggleTheme,
  isOpen,
  onCloseMobile,
  userName = 'Usuário',
  userAvatarColor = 'bg-[#d97757]',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#1a1a18] text-neutral-300 flex flex-col border-r border-neutral-800/80 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header Branding & New Chat */}
        <div className="p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-normal text-[#d97757] dark:text-[#e07a5f]">❊</span>
              <span className="font-serif text-lg font-medium text-neutral-100 tracking-tight">Claude</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded-md font-mono">Web & Artifacts</span>
            </div>
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-neutral-400 hover:text-white rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* "+ Criar" Primary Button */}
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#2b2b28] hover:bg-[#343431] text-neutral-100 rounded-lg transition-colors border border-neutral-700/50 shadow-xs group font-medium text-sm"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-neutral-300 group-hover:scale-110 transition-transform" />
              <span>Criar</span>
            </div>
            <span className="text-xs text-neutral-400 group-hover:text-neutral-200">⌘K</span>
          </button>
        </div>

        {/* Navigation Quick Links */}
        <div className="px-3 py-1 space-y-0.5 text-xs text-neutral-400 font-medium shrink-0">
          {/* Search */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Procurar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#21211f] border border-neutral-800 rounded-md text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>

          <button 
            onClick={onOpenArtifactsGallery}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#252523] text-neutral-300 hover:text-white transition-colors"
          >
            <LayoutGrid className="w-4 h-4 text-amber-500/80" />
            <span>Artefatos</span>
          </button>

          <button 
            onClick={onOpenSkills}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#252523] text-neutral-300 hover:text-white transition-colors"
          >
            <Boxes className="w-4 h-4 text-indigo-400" />
            <span>Skills & GitHub</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#252523] text-neutral-300 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
            <span>Personalização</span>
          </button>
        </div>

        <div className="my-2 px-3">
          <div className="h-px bg-neutral-800/80" />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            <span>Conversas e tarefas</span>
            <span className="text-[10px] text-neutral-600">{filteredSessions.length}</span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-neutral-500">
              Nenhuma conversa encontrada
            </div>
          ) : (
            filteredSessions.map((session, index) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onMouseEnter={() => setHoveredSessionId(session.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#2b2b28] text-neutral-100 font-medium'
                      : 'hover:bg-[#232321] text-neutral-400 hover:text-neutral-200'
                  }`}
                  onClick={() => {
                    onSelectSession(session.id);
                    onCloseMobile();
                  }}
                >
                  <div className="flex items-center gap-2 truncate pr-4">
                    <span className="text-[10px] text-neutral-500 font-mono">{index + 1}</span>
                    <span className="truncate">{session.title || 'Nova conversa'}</span>
                  </div>

                  {hoveredSessionId === session.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-red-400 rounded-sm hover:bg-neutral-800"
                      title="Excluir conversa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Profile & Theme Toggle */}
        <div className="p-3 border-t border-neutral-800/80 bg-[#161615] shrink-0 space-y-2">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2.5 text-left p-1 rounded-lg hover:bg-neutral-800/60 transition-colors group cursor-pointer max-w-[180px]"
              title="Clique para editar seu perfil nas configurações"
            >
              <div className={`w-7 h-7 rounded-full ${userAvatarColor} text-white font-serif flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                {userName.trim() ? userName.trim().charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-neutral-200 group-hover:text-white truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-neutral-500 truncate">Plano Open Source · Free</span>
              </div>
            </button>

            <button
              onClick={onToggleTheme}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
              title="Alternar tema claro/escuro"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
