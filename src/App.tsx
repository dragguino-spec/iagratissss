/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ClaudeWelcome } from './components/ClaudeWelcome';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ArtifactPanel } from './components/ArtifactPanel';
import { SkillsModal } from './components/SkillsModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ChatSession, ChatMessage as ChatMessageType, ProviderId, ReasoningEffortLevel, SkillPlugin, UserSettings, Artifact } from './types';
import { MODELS, SYSTEM_PRESETS, getAllModels, mapAshnaDetailedToModelInfo } from './constants/models';
import { BUILTIN_SKILLS, executeToolCall } from './services/skillManager';
import { streamChatCompletion } from './services/api';
import { extractArtifactsFromText, updateArtifactInStore } from './services/artifactExtractor';
import { calculateConversationTokens, optimizeMessagesContext } from './services/tokenCounter';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import { Menu } from 'lucide-react';

const INITIAL_SETTINGS: UserSettings = {
  userName: '',
  apiKeys: {
    included: '',
    ashna: '',
    xkiro: '',
    groq: '',
    openai: '',
    anthropic: '',
    gemini: '',
    openrouter: '',
    ollama: '',
  },
  ollamaBaseUrl: 'http://localhost:11434',
  xkiroBaseUrl: 'https://api.xkiro.com/v1',
  ashnaBaseUrl: 'https://api.ashna.ai/v1/api',
  ashnaCustomModel: '',
  ashnaDiscoveredModels: [],
  theme: 'dark',
  maxContextTokens: 128000,
  autoTruncate: true,
  temperature: 0.7,
  reasoningEffort: 'medium',
  customSystemPrompt: SYSTEM_PRESETS[0].prompt,
  codeRunnerTheme: 'vs-dark',
};

export default function App() {
  // Theme initialization
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Settings state
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('claude_web_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          apiKeys: { ...INITIAL_SETTINGS.apiKeys, ...(parsed.apiKeys || {}) },
        };
      } catch (e) {}
    }
    return INITIAL_SETTINGS;
  });

  // User Profile (Account Name & Avatar)
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('claude_user_name') || settings.userName || '';
  });
  const [userAvatarColor, setUserAvatarColor] = useState<string>(() => {
    return localStorage.getItem('claude_user_avatar_color') || 'bg-[#d97757]';
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    const savedName = localStorage.getItem('claude_user_name');
    return !savedName && !settings.userName;
  });

  const handleSaveUserName = (name: string, color?: string) => {
    setUserName(name);
    localStorage.setItem('claude_user_name', name);
    if (color) {
      setUserAvatarColor(color);
      localStorage.setItem('claude_user_avatar_color', color);
    }
    setSettings((prev) => {
      const updated = { ...prev, userName: name };
      localStorage.setItem('claude_web_settings', JSON.stringify(updated));
      return updated;
    });
    setIsOnboardingOpen(false);
  };

  const [isRefreshingAshna, setIsRefreshingAshna] = useState(false);

  const refreshAshnaModels = async (targetSettings?: UserSettings) => {
    const active = targetSettings || settings;
    const key = (active.apiKeys.ashna || '').trim();
    if (!key) return;

    setIsRefreshingAshna(true);
    try {
      const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/ashna/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: key,
          baseUrl: active.ashnaBaseUrl || 'https://api.ashna.ai/v1/api',
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        return;
      }
      if (res.ok && data?.ok) {
        const list: string[] = Array.isArray(data.models) ? data.models : [];
        const detailed = Array.isArray(data.detailedModels)
          ? data.detailedModels.map((m: any) => mapAshnaDetailedToModelInfo(m))
          : list.map((id) => mapAshnaDetailedToModelInfo({ id }));

        setSettings((prev) => {
          const updated = {
            ...prev,
            ashnaBaseUrl: data.baseUrl || prev.ashnaBaseUrl,
            ashnaDiscoveredModels: detailed,
          };
          localStorage.setItem('claude_web_settings', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      // Silent background sync failure; user can retry in Settings or Header
    } finally {
      setIsRefreshingAshna(false);
    }
  };

  useEffect(() => {
    if (settings.apiKeys.ashna?.trim() && (!settings.ashnaDiscoveredModels || settings.ashnaDiscoveredModels.length === 0)) {
      refreshAshnaModels(settings);
    }
  }, []);

  const allModels = useMemo(
    () => getAllModels(settings.ashnaDiscoveredModels),
    [settings.ashnaDiscoveredModels]
  );

  const handleSaveSettings = (newSettings: UserSettings) => {
    const keyChanged = (newSettings.apiKeys.ashna || '').trim() !== (settings.apiKeys.ashna || '').trim();
    const baseChanged = (newSettings.ashnaBaseUrl || '') !== (settings.ashnaBaseUrl || '');
    setSettings(newSettings);
    if (newSettings.userName) {
      setUserName(newSettings.userName);
      localStorage.setItem('claude_user_name', newSettings.userName);
    }
    localStorage.setItem('claude_web_settings', JSON.stringify(newSettings));
    if (
      newSettings.apiKeys.ashna?.trim() &&
      (keyChanged || baseChanged || !newSettings.ashnaDiscoveredModels?.length)
    ) {
      refreshAshnaModels(newSettings);
    }
  };

  // Skills state
  const [skills, setSkills] = useState<SkillPlugin[]>(() => {
    const saved = localStorage.getItem('claude_web_skills');
    return saved ? JSON.parse(saved) : BUILTIN_SKILLS;
  });

  const handleToggleSkill = (id: string) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSkills(updated);
    localStorage.setItem('claude_web_skills', JSON.stringify(updated));
  };

  const handleAddSkill = (skill: SkillPlugin) => {
    const existingIndex = skills.findIndex((s) => s.id === skill.id);
    let updated: SkillPlugin[];
    if (existingIndex >= 0) {
      updated = [...skills];
      updated[existingIndex] = skill;
    } else {
      updated = [...skills, skill];
    }
    setSkills(updated);
    localStorage.setItem('claude_web_skills', JSON.stringify(updated));
  };

  const handleRemoveSkill = (id: string) => {
    const updated = skills.filter((s) => s.id !== id);
    setSkills(updated);
    localStorage.setItem('claude_web_skills', JSON.stringify(updated));
  };

  // Chat Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('claude_web_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            selectedModel: s.selectedModel || 'qwen/qwen3.8-max',
            selectedProvider: s.selectedProvider || 'xkiro',
          }));
        }
      } catch (e) {}
    }
    const initialSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'Nova conversa',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectedModel: 'qwen/qwen3.8-max',
      selectedProvider: 'xkiro',
      activeSkillIds: BUILTIN_SKILLS.map((s) => s.id),
      artifacts: {},
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || `chat-${Date.now()}`);
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    localStorage.setItem('claude_web_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const [selectedModelId, setSelectedModelId] = useState<string>(
    activeSession?.selectedModel || 'qwen/qwen3.8-max'
  );
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(
    activeSession?.selectedProvider || 'xkiro'
  );
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffortLevel>(
    () => activeSession?.reasoningEffort || settings.reasoningEffort || 'medium'
  );

  // Synchronize active model, provider and reasoning effort when switching chat session
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setActiveMobileTab('chat');
    const targetSession = sessions.find((s) => s.id === id);
    if (targetSession) {
      if (targetSession.selectedModel && targetSession.selectedProvider) {
        setSelectedModelId(targetSession.selectedModel);
        setSelectedProviderId(targetSession.selectedProvider);
      }
      if (targetSession.reasoningEffort) {
        setReasoningEffort(targetSession.reasoningEffort);
      }
    }
  };

  const handleSelectModel = (modelId: string, providerId: ProviderId) => {
    setSelectedModelId(modelId);
    setSelectedProviderId(providerId);
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, selectedModel: modelId, selectedProvider: providerId } : s))
    );
  };

  const handleSelectReasoningEffort = (level: ReasoningEffortLevel) => {
    setReasoningEffort(level);
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, reasoningEffort: level } : s))
    );
    setSettings((prev) => {
      const updated = { ...prev, reasoningEffort: level };
      localStorage.setItem('claude_web_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Device Detection (PC vs Mobile)
  const { isMobile, deviceType } = useDeviceDetect();
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'artifact'>('chat');

  // UI Modals & Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isLoading]);

  // Handle New Chat creation
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'Nova conversa',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectedModel: selectedModelId,
      selectedProvider: selectedProviderId,
      reasoningEffort,
      activeSkillIds: skills.filter((s) => s.enabled).map((s) => s.id),
      artifacts: {},
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsArtifactPanelOpen(false);
    setActiveArtifactId(null);
    setActiveMobileTab('chat');
  };

  // Handle Delete Chat session
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    if (updated.length === 0) {
      handleNewChat();
    } else {
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
  };

  // Open specific artifact in right panel
  const handleOpenArtifact = (artifactId: string) => {
    setActiveArtifactId(artifactId);
    setIsArtifactPanelOpen(true);
    if (isMobile) {
      setActiveMobileTab('artifact');
    }
  };

  // Primary Message Handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Update title of conversation if first message
    const updatedTitle = activeSession.messages.length === 0
      ? text.slice(0, 30) + (text.length > 30 ? '...' : '')
      : activeSession.title;

    const currentMessages = [...activeSession.messages, userMessage];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              title: updatedTitle,
              messages: currentMessages,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );

    // Prepare assistant response message placeholder
    const assistantMsgId = `msg-asst-${Date.now()}`;
    const assistantMsg: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: MODELS.find((m) => m.id === selectedModelId)?.name || selectedModelId,
      providerUsed: selectedProviderId,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...currentMessages, assistantMsg] }
          : s
      )
    );

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    // Optimize messages context if limit exceeded
    const { optimizedMessages } = optimizeMessagesContext(
      currentMessages,
      settings.maxContextTokens,
      4096
    );

    await streamChatCompletion({
      messages: optimizedMessages,
      modelId: selectedModelId,
      providerId: selectedProviderId,
      reasoningEffort,
      systemPrompt: settings.customSystemPrompt,
      settings,
      activeSkills: skills.filter((s) => s.enabled),
      signal: abortControllerRef.current.signal,
      onChunk: ({ text: chunkText, reasoningText, toolCalls }) => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSessionId) return s;

            const msgs = s.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;

              const newContent = m.content + (chunkText || '');
              const newReasoning = (m.reasoningContent || '') + (reasoningText || '');

              // Extract and update artifacts live during stream!
              const extracted = extractArtifactsFromText(newContent);
              let updatedStore = { ...s.artifacts };
              const artifactIds: string[] = [...(m.artifactIds || [])];

              extracted.forEach((ext) => {
                const result = updateArtifactInStore(updatedStore, ext);
                updatedStore = result.updatedStore;
                if (!artifactIds.includes(result.artifactId)) {
                  artifactIds.push(result.artifactId);
                }
                // Automatically open panel when artifact detected
                if (!activeArtifactId || activeArtifactId !== result.artifactId) {
                  setActiveArtifactId(result.artifactId);
                  setIsArtifactPanelOpen(true);
                }
              });

              return {
                ...m,
                content: newContent,
                reasoningContent: newReasoning || undefined,
                artifactIds,
                toolCalls: toolCalls || m.toolCalls,
              };
            });

            // Sync updated artifacts object to session store
            const latestAsstMsg = msgs.find((m) => m.id === assistantMsgId);
            const extractedLive = latestAsstMsg ? extractArtifactsFromText(latestAsstMsg.content) : [];
            let sessionArtifacts = { ...s.artifacts };

            extractedLive.forEach((ext) => {
              const res = updateArtifactInStore(sessionArtifacts, ext);
              sessionArtifacts = res.updatedStore;
            });

            return {
              ...s,
              messages: msgs,
              artifacts: sessionArtifacts,
            };
          })
        );
      },
      onError: (errMsg) => {
        setIsLoading(false);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + `\n\n⚠️ Erro na resposta: ${errMsg}` }
                  : m
              ),
            };
          })
        );
      },
      onFinish: (fullText, reasoningText) => {
        setIsLoading(false);
      },
    });
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // Calculate token usage
  const tokenStats = useMemo(() => {
    const calc = calculateConversationTokens(activeSession.messages, settings.customSystemPrompt);
    return {
      totalTokens: calc.totalTokens,
      maxTokens: settings.maxContextTokens,
    };
  }, [activeSession.messages, settings.customSystemPrompt, settings.maxContextTokens]);

  const activeArtifact = activeArtifactId ? activeSession.artifacts[activeArtifactId] : null;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white dark:bg-[#1a1a19] text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onOpenSkills={() => setIsSkillsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenArtifactsGallery={() => {
          setIsArtifactPanelOpen(true);
          if (isMobile) setActiveMobileTab('artifact');
        }}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        userName={userName || 'Usuário'}
        userAvatarColor={userAvatarColor}
      />

      {/* Main Workspace Layout (Chat + Split Screen Artifact Panel) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-3 text-neutral-500 hover:text-white cursor-pointer"
            title="Abrir menu de conversas"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <Header
              selectedModel={selectedModelId}
              selectedProvider={selectedProviderId}
              onSelectModel={handleSelectModel}
              models={allModels}
              hasAshnaKey={Boolean(settings.apiKeys.ashna?.trim())}
              isRefreshingAshna={isRefreshingAshna}
              onRefreshAshnaModels={() => refreshAshnaModels()}
              reasoningEffort={reasoningEffort}
              onSelectReasoningEffort={handleSelectReasoningEffort}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onOpenSkills={() => setIsSkillsModalOpen(true)}
              isArtifactPanelOpen={isArtifactPanelOpen}
              onToggleArtifactPanel={() => {
                if (isMobile) {
                  if (!isArtifactPanelOpen) {
                    setIsArtifactPanelOpen(true);
                    setActiveMobileTab('artifact');
                  } else {
                    setActiveMobileTab((prev) => (prev === 'artifact' ? 'chat' : 'artifact'));
                  }
                } else {
                  setIsArtifactPanelOpen(!isArtifactPanelOpen);
                }
              }}
              tokenStats={tokenStats}
              artifactCount={Object.keys(activeSession.artifacts).length}
              isMobile={isMobile}
              activeMobileTab={activeMobileTab}
              onSelectMobileTab={setActiveMobileTab}
            />
          </div>
        </div>

        {/* Central Split View */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Left Chat Column */}
          <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            isMobile && isArtifactPanelOpen && activeMobileTab === 'artifact' ? 'hidden' : 'flex'
          }`}>
            {activeSession.messages.length === 0 ? (
              <ClaudeWelcome
                onSendMessage={handleSendMessage}
                selectedModelName={
                  selectedModelId === 'ashna/custom' && settings.ashnaCustomModel?.trim()
                    ? `${settings.ashnaCustomModel.trim()} (Ashna AI)`
                    : allModels.find((m) => m.id === selectedModelId && m.provider === selectedProviderId)?.name ||
                      allModels.find((m) => m.id === selectedModelId)?.name ||
                      selectedModelId
                }
                reasoningEffort={reasoningEffort}
                onSelectReasoningEffort={handleSelectReasoningEffort}
                userName={userName}
              />
            ) : (
              <>
                {/* Scrollable Chat Stream */}
                <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/40">
                  {activeSession.messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      artifacts={activeSession.artifacts}
                      onOpenArtifact={handleOpenArtifact}
                      onRegenerate={() => {
                        const lastUserMsg = activeSession.messages.filter((m) => m.role === 'user').pop();
                        if (lastUserMsg) handleSendMessage(lastUserMsg.content);
                      }}
                      userName={userName || 'Você'}
                      userAvatarColor={userAvatarColor}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Control Box */}
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  onStopGeneration={handleStopGeneration}
                  selectedModelId={selectedModelId}
                  models={allModels}
                  onSelectModel={(id) => {
                    const found = allModels.find((m) => m.id === id);
                    if (found) handleSelectModel(found.id, found.provider);
                  }}
                  reasoningEffort={reasoningEffort}
                  onSelectReasoningEffort={handleSelectReasoningEffort}
                  activeSkills={skills}
                  onOpenSkills={() => setIsSkillsModalOpen(true)}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                />
              </>
            )}
          </div>

          {/* Right Artifact Panel */}
          {isArtifactPanelOpen && (
            <div className={`h-full ${
              isMobile 
                ? (activeMobileTab === 'artifact' ? 'w-full flex-1' : 'hidden') 
                : 'shrink-0'
            }`}>
              <ArtifactPanel
                artifact={activeArtifact}
                onClose={() => {
                  setIsArtifactPanelOpen(false);
                  if (isMobile) setActiveMobileTab('chat');
                }}
                isMobile={isMobile}
                onBackToChat={() => setActiveMobileTab('chat')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SkillsModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        skills={skills}
        onToggleSkill={handleToggleSkill}
        onAddSkill={handleAddSkill}
        onRemoveSkill={handleRemoveSkill}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* First-Time User Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onSaveName={handleSaveUserName}
      />
    </div>
  );
}
