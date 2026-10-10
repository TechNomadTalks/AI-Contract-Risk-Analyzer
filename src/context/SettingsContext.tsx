'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SkillNode, getDefaultSkillTree, UserSettings } from '@/lib/database';

interface SettingsContextValue {
  ollamaUrl: string;
  ollamaModel: string;
  customApiUrl: string;
  customApiKey: string;
  useCustomApi: boolean;
  skillTree: SkillNode[];
  isLoading: boolean;
  error: string | null;
  setOllamaUrl: (url: string) => Promise<void>;
  setOllamaModel: (model: string) => Promise<void>;
  setCustomApiUrl: (url: string) => Promise<void>;
  setCustomApiKey: (key: string) => Promise<void>;
  setUseCustomApi: (enabled: boolean) => Promise<void>;
  setSkillTree: (tree: SkillNode[]) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings?userId=default');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        setError('Failed to load settings');
        setSettings({
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'llama3.1:8b',
          useCustomApi: false,
          skillTree: getDefaultSkillTree(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setSettings({
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'llama3.1:8b',
        useCustomApi: false,
        skillTree: getDefaultSkillTree(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default', ...updates }),
      });
      
      if (response.ok) {
        setSettings(prev => ({ ...prev, ...updates }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save settings:', err);
      return false;
    }
  }, []);

  const setOllamaUrl = useCallback(async (url: string) => {
    await saveSettings({ ollamaUrl: url });
  }, [saveSettings]);

  const setOllamaModel = useCallback(async (model: string) => {
    await saveSettings({ ollamaModel: model });
  }, [saveSettings]);

  const setCustomApiUrl = useCallback(async (url: string) => {
    await saveSettings({ customApiUrl: url });
  }, [saveSettings]);

  const setCustomApiKey = useCallback(async (key: string) => {
    await saveSettings({ customApiKey: key });
  }, [saveSettings]);

  const setUseCustomApi = useCallback(async (enabled: boolean) => {
    await saveSettings({ useCustomApi: enabled });
  }, [saveSettings]);

  const setSkillTree = useCallback(async (tree: SkillNode[]) => {
    await saveSettings({ skillTree: tree });
  }, [saveSettings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const value: SettingsContextValue = {
    ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
    ollamaModel: settings.ollamaModel || 'llama3.1:8b',
    customApiUrl: settings.customApiUrl || '',
    customApiKey: settings.customApiKey || '',
    useCustomApi: settings.useCustomApi || false,
    skillTree: settings.skillTree || getDefaultSkillTree(),
    isLoading,
    error,
    setOllamaUrl,
    setOllamaModel,
    setCustomApiUrl,
    setCustomApiKey,
    setUseCustomApi,
    setSkillTree,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}