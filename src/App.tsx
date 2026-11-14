/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ClaudeWelcome } from './components/ClaudeWelcome';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ArtifactPanel } from './components/ArtifactPanel';
import { SkillsModal } from './components/SkillsModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import {
  ChatAttachment,
  ChatSession,
  ChatMessage as ChatMessageType,
  ProviderId,
  ReasoningEffortLevel,
  SkillPlugin,
  UserSettings,
} from './types';
import { SYSTEM_PRESETS, getAllModels, mapAshnaDetailedToModelInfo } from './constants/models';
import { BUILTIN_SKILLS } from './services/skillManager';
import { streamChatCompletion } from './services/api';
import { extractArtifactsFromText, updateArtifactInStore } from './services/artifactExtractor';
import { calculateConversationTokens, optimizeMessagesContext } from './services/tokenCounter';
import { sanitizeAttachmentForStorage } from './services/fileProcessor';
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

function createFreshSession(
  modelId: string,
  providerId: ProviderId,
  effort: ReasoningEffortLevel,
  skills: SkillPlugin[]
): ChatSession {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'Nova conversa',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selectedModel: modelId,
    selectedProvider: providerId,
    reasoningEffort: effort,
    activeSkillIds: skills.filter((s) => s.enabled).map((s) => s.id),
    artifacts: {},
  };
}

export default function App() {
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
      } catch {
        // Fallback to defaults if corrupted
      }
    }
    return INITIAL_SETTINGS;
  });

  // Theme initialization & persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('claude_web_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return settings.theme === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('claude_web_theme', theme);
  }, [theme]);

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
    } catch {
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
    const trimmedName = (newSettings.userName || '').trim();
    const normalizedSettings = { ...newSettings, userName: trimmedName };

    setSettings(normalizedSettings);
    setUserName(trimmedName);
    if (trimmedName) {
      localStorage.setItem('claude_user_name', trimmedName);
    } else {
      localStorage.removeItem('claude_user_name');
    }
    localStorage.setItem('claude_web_settings', JSON.stringify(normalizedSettings));

    if (
      normalizedSettings.apiKeys.ashna?.trim() &&
      (keyChanged || baseChanged || !normalizedSettings.ashnaDiscoveredModels?.length)
    ) {
      refreshAshnaModels(normalizedSettings);
    }
  };

  // Skills state (safe JSON parse)
  const [skills, setSkills] = useState<SkillPlugin[]>(() => {
    const saved = localStorage.getItem('claude_web_skills');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback to built-in skills
      }
    }
    return BUILTIN_SKILLS;
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
            selectedModel: s.selectedModel || 'mercury-3',
            selectedProvider: s.selectedProvider || 'included',
            artifacts: s.artifacts || {},
            messages: Array.isArray(s.messages) ? s.messages : [],
          }));
        }
      } catch {
        // Fallback below
      }
    }
    return [createFreshSession('mercury-3', 'included', settings.reasoningEffort || 'medium', BUILTIN_SKILLS)];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || `chat-${Date.now()}`);
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    try {
      const storageSafe = sessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.attachments
            ? { ...m, attachments: m.attachments.map(sanitizeAttachmentForStorage) }
            : m
        ),
      }));
      localStorage.setItem('claude_web_sessions', JSON.stringify(storageSafe));
    } catch {
      try {
        const minimal = sessions.map((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.attachments
              ? {
                  ...m,
                  attachments: m.attachments.map((a) => ({
                    id: a.id,
                    name: a.name,
                    size: a.size,
                    mimeType: a.mimeType,
                    kind: a.kind,
                    summary: a.summary,
                  })),
                }
              : m
          ),
        }));
        localStorage.setItem('claude_web_sessions', JSON.stringify(minimal));
      } catch {
        // Ignore storage quota errors cleanly
      }
    }
  }, [sessions]);

  const [selectedModelId, setSelectedModelId] = useState<string>(
    activeSession?.selectedModel || 'mercury-3'
  );
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(
    activeSession?.selectedProvider || 'included'
  );
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffortLevel>(
    () => activeSession?.reasoningEffort || settings.reasoningEffort || 'medium'
  );

  // Device Detection (PC vs Mobile)
  const { isMobile } = useDeviceDetect();
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'artifact'>('chat');

  // UI Modals & Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastAutoOpenedArtifactRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const runtimeAttachmentsRef = useRef<Record<string, ChatAttachment[]>>({});

  const stopActiveStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Synchronize active model, provider, effort and artifact when switching chat session
  const handleSelectSession = (id: string) => {
    if (id !== activeSessionId) {
      stopActiveStream();
    }
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
      const artifactKeys = Object.keys(targetSession.artifacts || {});
      setActiveArtifactId(artifactKeys.length > 0 ? artifactKeys[artifactKeys.length - 1] : null);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isLoading]);

  // Handle New Chat creation
  const handleNewChat = useCallback(() => {
    stopActiveStream();
    const newSession = createFreshSession(selectedModelId, selectedProviderId, reasoningEffort, skills);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsArtifactPanelOpen(false);
    setActiveArtifactId(null);
    lastAutoOpenedArtifactRef.current = null;
    setActiveMobileTab('chat');
  }, [stopActiveStream, selectedModelId, selectedProviderId, reasoningEffort, skills]);

  // Keyboard shortcut Cmd+K / Ctrl+K for New Chat (matches Sidebar badge)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleNewChat]);

  // Handle Delete Chat session cleanly (including deleting the very last session)
  const handleDeleteSession = (id: string) => {
    if (id === activeSessionId) {
      stopActiveStream();
    }
    const updated = sessions.filter((s) => s.id !== id);
    if (updated.length === 0) {
      const fresh = createFreshSession(selectedModelId, selectedProviderId, reasoningEffort, skills);
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      setIsArtifactPanelOpen(false);
      setActiveArtifactId(null);
      setActiveMobileTab('chat');
      return;
    }

    setSessions(updated);
    if (activeSessionId === id) {
      const fallbackSession = updated[0];
      setActiveSessionId(fallbackSession.id);
      setSelectedModelId(fallbackSession.selectedModel || 'mercury-3');
      setSelectedProviderId(fallbackSession.selectedProvider || 'included');
      const artKeys = Object.keys(fallbackSession.artifacts || {});
      setActiveArtifactId(artKeys.length > 0 ? artKeys[artKeys.length - 1] : null);
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

  const sessionArtifactsList = useMemo(
    () => Object.values(activeSession.artifacts || {}),
    [activeSession.artifacts]
  );

  const openArtifactsPanelSmart = () => {
    if (!activeArtifactId || !activeSession.artifacts?.[activeArtifactId]) {
      const latest = sessionArtifactsList[sessionArtifactsList.length - 1];
      if (latest) setActiveArtifactId(latest.id);
    }
    setIsArtifactPanelOpen(true);
    if (isMobile) setActiveMobileTab('artifact');
  };

  const runAssistantStream = async (targetSessionId: string, messagesForApi: ChatMessageType[]) => {
    const assistantMsgId = `msg-asst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const assistantModelName =
      selectedModelId === 'ashna/custom' && settings.ashnaCustomModel?.trim()
        ? `${settings.ashnaCustomModel.trim()} (Ashna AI)`
        : allModels.find((m) => m.id === selectedModelId && m.provider === selectedProviderId)?.name ||
          allModels.find((m) => m.id === selectedModelId)?.name ||
          selectedModelId;

    const assistantMsg: ChatMessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: assistantModelName,
      providerUsed: selectedProviderId,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === targetSessionId ? { ...s, messages: [...messagesForApi, assistantMsg] } : s
      )
    );

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastAutoOpenedArtifactRef.current = null;

    const { optimizedMessages } = settings.autoTruncate
      ? optimizeMessagesContext(messagesForApi, settings.maxContextTokens, 4096)
      : { optimizedMessages: messagesForApi };

    const hydratedMessages = optimizedMessages.map((m) => ({
      ...m,
      attachments: runtimeAttachmentsRef.current[m.id] || m.attachments,
    }));

    await streamChatCompletion({
      messages: hydratedMessages,
      modelId: selectedModelId,
      providerId: selectedProviderId,
      reasoningEffort,
      systemPrompt: settings.customSystemPrompt,
      settings,
      activeSkills: skills.filter((s) => s.enabled),
      signal: controller.signal,
      onChunk: ({ text: chunkText, reasoningText, toolCalls }) => {
        let detectedNewArtifactId: string | null = null;

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== targetSessionId) return s;

            let sessionArtifacts = { ...s.artifacts };
            const msgs = s.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;

              const newContent = m.content + (chunkText || '');
              const newReasoning = (m.reasoningContent || '') + (reasoningText || '');

              const extracted = extractArtifactsFromText(newContent);
              const artifactIds: string[] = [...(m.artifactIds || [])];

              extracted.forEach((ext) => {
                const result = updateArtifactInStore(sessionArtifacts, ext, assistantMsgId);
                sessionArtifacts = result.updatedStore;
                if (!artifactIds.includes(result.artifactId)) {
                  artifactIds.push(result.artifactId);
                }
                detectedNewArtifactId = result.artifactId;
              });

              return {
                ...m,
                content: newContent,
                reasoningContent: newReasoning || undefined,
                artifactIds,
                toolCalls: toolCalls || m.toolCalls,
              };
            });

            return {
              ...s,
              messages: msgs,
              artifacts: sessionArtifacts,
            };
          })
        );

        if (detectedNewArtifactId && lastAutoOpenedArtifactRef.current !== detectedNewArtifactId) {
          lastAutoOpenedArtifactRef.current = detectedNewArtifactId;
          setActiveArtifactId(detectedNewArtifactId);
          setIsArtifactPanelOpen(true);
        }
      },
      onError: (errMsg) => {
        setIsLoading(false);
        abortControllerRef.current = null;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== targetSessionId) return s;
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
      onFinish: () => {
        setIsLoading(false);
        abortControllerRef.current = null;
      },
    });
  };

  // Primary Message Handler
  const handleSendMessage = async (text: string, attachments?: ChatAttachment[]) => {
    if ((!text.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (attachments && attachments.length > 0) {
      runtimeAttachmentsRef.current[msgId] = attachments;
    }

    const userMessage: ChatMessageType = {
      id: msgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments: attachments && attachments.length > 0 ? attachments.map(sanitizeAttachmentForStorage) : undefined,
    };

    const titleSeed = text.trim() || attachments?.[0]?.name || 'Arquivo anexado';
    const updatedTitle =
      activeSession.messages.length === 0
        ? titleSeed.slice(0, 30) + (titleSeed.length > 30 ? '...' : '')
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

    await runAssistantStream(activeSessionId, currentMessages);
  };

  // Clean in-place regeneration without duplicating the user message
  const handleRegenerateMessage = async (assistantMsgId: string) => {
    if (isLoading) return;
    const msgIdx = activeSession.messages.findIndex((m) => m.id === assistantMsgId);
    if (msgIdx < 0) return;

    const truncatedMessages = activeSession.messages.slice(0, msgIdx);
    const hasUserPrompt = truncatedMessages.some((m) => m.role === 'user');
    if (!hasUserPrompt) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: truncatedMessages, updatedAt: new Date().toISOString() }
          : s
      )
    );

    await runAssistantStream(activeSessionId, truncatedMessages);
  };

  const handleStopGeneration = () => {
    stopActiveStream();
  };

  // Calculate token usage
  const tokenStats = useMemo(() => {
    const calc = calculateConversationTokens(activeSession.messages, settings.customSystemPrompt);
    return {
      totalTokens: calc.totalTokens,
      maxTokens: settings.maxContextTokens,
    };
  }, [activeSession.messages, settings.customSystemPrompt, settings.maxContextTokens]);

  const activeArtifact =
    (activeArtifactId && activeSession.artifacts?.[activeArtifactId]) ||
    (sessionArtifactsList.length > 0 ? sessionArtifactsList[sessionArtifactsList.length - 1] : null);

  const selectedModelDisplayName =
    selectedModelId === 'ashna/custom' && settings.ashnaCustomModel?.trim()
      ? `${settings.ashnaCustomModel.trim()} (Ashna AI)`
      : allModels.find((m) => m.id === selectedModelId && m.provider === selectedProviderId)?.name ||
        allModels.find((m) => m.id === selectedModelId)?.name ||
        selectedModelId;

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
        onOpenArtifactsGallery={openArtifactsPanelSmart}
        theme={theme}
        onToggleTheme={() => {
          const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          setSettings((prev) => {
            const updated = { ...prev, theme: next };
            localStorage.setItem('claude_web_settings', JSON.stringify(updated));
            return updated;
          });
        }}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        userName={userName || 'Usuário'}
        userAvatarColor={userAvatarColor}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-3 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
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
              ashnaCustomModel={settings.ashnaCustomModel}
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
                    openArtifactsPanelSmart();
                  } else {
                    setActiveMobileTab((prev) => (prev === 'artifact' ? 'chat' : 'artifact'));
                  }
                } else {
                  if (!isArtifactPanelOpen) {
                    openArtifactsPanelSmart();
                  } else {
                    setIsArtifactPanelOpen(false);
                  }
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
          <div
            className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
              isMobile && isArtifactPanelOpen && activeMobileTab === 'artifact' ? 'hidden' : 'flex'
            }`}
          >
            {activeSession.messages.length === 0 ? (
              <ClaudeWelcome
                onSendMessage={handleSendMessage}
                selectedModelName={selectedModelDisplayName}
                selectedModelId={selectedModelId}
                selectedProviderId={selectedProviderId}
                models={allModels}
                onSelectModel={handleSelectModel}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
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
                      onRegenerate={
                        msg.role === 'assistant' ? () => handleRegenerateMessage(msg.id) : undefined
                      }
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
                  selectedProviderId={selectedProviderId}
                  ashnaCustomModel={settings.ashnaCustomModel}
                  models={allModels}
                  onSelectModel={(id, provider) => {
                    const found =
                      allModels.find((m) => m.id === id && (!provider || m.provider === provider)) ||
                      allModels.find((m) => m.id === id);
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
            <div
              className={`h-full ${
                isMobile ? (activeMobileTab === 'artifact' ? 'w-full flex-1' : 'hidden') : 'shrink-0'
              }`}
            >
              <ArtifactPanel
                artifact={activeArtifact}
                allArtifacts={sessionArtifactsList}
                onSelectArtifact={(id) => setActiveArtifactId(id)}
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
      <OnboardingModal isOpen={isOnboardingOpen} onSaveName={handleSaveUserName} />
    </div>
  );
}
