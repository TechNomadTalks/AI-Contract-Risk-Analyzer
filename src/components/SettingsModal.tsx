'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Wifi, WifiOff, Brain, Zap, Plus, Minus, ChevronDown, ChevronUp, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { SkillNode, getDefaultSkillTree } from '@/lib/database';
import { clsx } from 'clsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OLLAMA_MODELS = [
  'llama3.1:8b',
  'llama3.1:12b',
  'llama3.2:8b',
  'llama3.2:12b',
  'mistral:7b',
  'mistral:12b',
  'qwen2.5:7b',
  'qwen2.5:12b',
  'phi3:14b',
  'gemma2:9b',
  'gemma2:12b',
];

function SkillTreeNode({ 
  node, 
  level = 0, 
  onToggle, 
  onEdit,
  onAddChild,
  onRemove 
}: { 
  node: SkillNode; 
  level?: number;
  onToggle: (id: string) => void;
  onEdit: (id: string, prompt: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(node.prompt);

  const handleSave = () => {
    onEdit(node.id, editPrompt);
    setIsEditing(false);
  };

  return (
    <div className={clsx('pl-4 border-l border-[#2e2e3a]', level > 0 && 'ml-4')}>
      <div className="flex items-center gap-2 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-[#94a3b8] hover:text-[#f8fafc]"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        <button
          onClick={() => onToggle(node.id)}
          className={clsx(
            'p-1.5 rounded',
            node.enabled ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#2e2e3a] text-[#94a3b8]'
          )}
        >
          {node.enabled ? <Brain className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
        </button>
        
        <span className={clsx('font-medium text-sm flex-1', node.enabled ? 'text-[#f8fafc]' : 'text-[#94a3b8]')}>
          {node.name}
        </span>
        
        <button
          onClick={() => onAddChild(node.id)}
          className="p-1.5 rounded bg-[#1a1a24] text-[#94a3b8] hover:text-[#6366f1] hover:bg-[#2e2e3a] transition-colors"
          title="Add child skill"
        >
          <Plus className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => { setIsEditing(true); setEditPrompt(node.prompt); }}
          className="p-1.5 rounded bg-[#1a1a24] text-[#94a3b8] hover:text-[#f59e0b] hover:bg-[#2e2e3a] transition-colors"
          title="Edit prompt"
        >
          <Zap className="w-4 h-4" />
        </button>
        
        {level > 0 && (
          <button
            onClick={() => onRemove(node.id)}
            className="p-1.5 rounded bg-[#1a1a24] text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#2e2e3a] transition-colors"
            title="Remove skill"
          >
            <Minus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {isEditing && (
        <div className="pl-6 py-2">
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }}}
            className="w-full bg-[#0a0a0f] border border-[#2e2e3a] rounded p-2 text-sm text-[#f8fafc] focus:border-[#6366f1] focus:outline-none resize-none min-h-[60px]"
            placeholder="Enter skill prompt..."
            autoFocus
          />
        </div>
      )}
      
      {isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <SkillTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.1:8b');
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [useCustomApi, setUseCustomApi] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [skillTree, setSkillTree] = useState<SkillNode[]>(getDefaultSkillTree());
  const [activeTab, setActiveTab] = useState<'ollama' | 'custom-api' | 'skills'>('ollama');
  const [saving, setSaving] = useState(false);

  const checkOllamaConnection = useCallback(async () => {
    setOllamaStatus('checking');
    try {
      const response = await fetch(`/api/ollama`);
      if (response.ok) {
        const data = await response.json();
        setOllamaStatus(data.connected ? 'connected' : 'disconnected');
        setAvailableModels(data.availableModels || []);
        if (data.models && data.models.length > 0 && !OLLAMA_MODELS.includes(data.models[0])) {
          setOllamaModel(data.models[0]);
        }
      } else {
        setOllamaStatus('disconnected');
      }
    } catch {
      setOllamaStatus('disconnected');
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings?userId=default');
      if (response.ok) {
        const data = await response.json();
        setOllamaUrl(data.ollamaUrl || 'http://localhost:11434');
        setOllamaModel(data.ollamaModel || 'llama3.1:8b');
        setUseCustomApi(data.useCustomApi || false);
        setCustomApiUrl(data.customApiUrl || '');
        setCustomApiKey(data.customApiKey || '');
        if (data.skillTree) setSkillTree(data.skillTree);
      }
    } catch {
      console.error('Failed to load settings:');
    }
    checkOllamaConnection();
  }, [checkOllamaConnection]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default',
          ollamaUrl,
          ollamaModel,
          useCustomApi,
          customApiUrl,
          customApiKey,
          skillTree,
        }),
      });
      
      const ollamaResponse = await fetch('/api/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', settings: { url: ollamaUrl, model: ollamaModel } }),
      });
      
      if (ollamaResponse.ok) {
        checkOllamaConnection();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (id: string) => {
    setSkillTree(tree => {
      const toggle = (nodes: SkillNode[]): SkillNode[] => 
        nodes.map(node => {
          if (node.id === id) return { ...node, enabled: !node.enabled };
          if (node.children.length > 0) return { ...node, children: toggle(node.children) };
          return node;
        });
      return toggle(tree);
    });
  };

  const editSkill = (id: string, prompt: string) => {
    setSkillTree(tree => {
      const edit = (nodes: SkillNode[]): SkillNode[] =>
        nodes.map(node => {
          if (node.id === id) return { ...node, prompt };
          if (node.children.length > 0) return { ...node, children: edit(node.children) };
          return node;
        });
      return edit(tree);
    });
  };

  const addChildSkill = (parentId: string) => {
    const newSkill: SkillNode = {
      id: `skill-${Date.now()}`,
      name: 'New Skill',
      description: 'Custom analysis skill',
      prompt: 'Analyze the clause for...',
      enabled: true,
      children: [],
      parentId,
    };
    
    setSkillTree(tree => {
      const add = (nodes: SkillNode[]): SkillNode[] =>
        nodes.map(node => {
          if (node.id === parentId) return { ...node, children: [...node.children, newSkill] };
          if (node.children.length > 0) return { ...node, children: add(node.children) };
          return node;
        });
      return add(tree);
    });
  };

  const removeSkill = (id: string) => {
    setSkillTree(tree => {
      const remove = (nodes: SkillNode[]): SkillNode[] =>
        nodes
          .filter(node => node.id !== id)
          .map(node => ({ ...node, children: remove(node.children) }));
      return remove(tree);
    });
  };

  const resetSkillTree = async () => {
    const defaultTree = getDefaultSkillTree();
    setSkillTree(defaultTree);
    try {
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default' }),
      });
    } catch (error) {
      console.error('Failed to reset skill tree:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#12121a] border border-[#2e2e3a] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#2e2e3a]">
          <h2 className="text-[#f8fafc] text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1a1a24] transition-colors">
            <X className="w-5 h-5 text-[#94a3b8]" />
          </button>
        </div>

        <div className="flex border-b border-[#2e2e3a] overflow-x-auto">
          {[
            { id: 'ollama', label: 'Ollama', icon: Brain },
            { id: 'custom-api', label: 'Custom API', icon: Zap },
            { id: 'skills', label: 'Skill Tree', icon: Brain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1]'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'ollama' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[#f8fafc] font-medium mb-4">Ollama Configuration</h3>
                <p className="text-[#94a3b8] text-sm mb-4">
                  Configure local Ollama instance for AI-powered contract analysis. 
                  Recommended models: 8B-12B parameter models for best quality/speed balance.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1">Ollama URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-[#2e2e3a] rounded-lg px-4 py-2 text-[#f8fafc] focus:border-[#6366f1] focus:outline-none"
                    placeholder="http://localhost:11434"
                  />
                </div>

                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1">Model</label>
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-[#2e2e3a] rounded-lg px-4 py-2 text-[#f8fafc] focus:border-[#6366f1] focus:outline-none"
                  >
                    {OLLAMA_MODELS.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                    {availableModels.filter(m => !OLLAMA_MODELS.includes(m)).map(model => (
                      <option key={model} value={model}>{model} (installed)</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={checkOllamaConnection}
                    disabled={ollamaStatus === 'checking'}
                    className="px-4 py-2 bg-[#1a1a24] border border-[#2e2e3a] rounded-lg text-[#f8fafc] hover:border-[#6366f1] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className={clsx('w-4 h-4', ollamaStatus === 'checking' && 'animate-spin')} />
                    Check Connection
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {ollamaStatus === 'connected' ? (
                      <>
                        <Wifi className="w-4 h-4 text-[#22c55e]" />
                        <span className="text-[#22c55e] text-sm">Connected</span>
                      </>
                    ) : ollamaStatus === 'checking' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[#6366f1] text-sm">Checking...</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-[#ef4444]" />
                        <span className="text-[#ef4444] text-sm">Disconnected</span>
                      </>
                    )}
                  </div>
                </div>

                {availableModels.length > 0 && (
                  <div>
                    <label className="block text-[#94a3b8] text-sm mb-1">Available Models</label>
                    <div className="flex flex-wrap gap-2">
                      {availableModels.map(model => (
                        <span 
                          key={model}
                          className={clsx(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            model === ollamaModel 
                              ? 'bg-[#6366f1]/30 text-[#6366f1] border border-[#6366f1]/50'
                              : 'bg-[#1a1a24] text-[#94a3b8] border border-[#2e2e3a]'
                          )}
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'custom-api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[#f8fafc] font-medium mb-4">Custom AI API</h3>
                <p className="text-[#94a3b8] text-sm mb-4">
                  Use your own AI API (OpenAI-compatible) instead of local Ollama. 
                  Supports any OpenAI-compatible endpoint.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={useCustomApi}
                    onChange={(e) => setUseCustomApi(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2e2e3a] bg-[#0a0a0f] text-[#6366f1] focus:ring-[#6366f1]"
                  />
                  <span className="text-[#f8fafc]">Enable Custom API</span>
                </label>

                {useCustomApi && (
                  <>
                    <div>
                      <label className="block text-[#94a3b8] text-sm mb-1">API Endpoint</label>
                      <input
                        type="text"
                        value={customApiUrl}
                        onChange={(e) => setCustomApiUrl(e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-[#2e2e3a] rounded-lg px-4 py-2 text-[#f8fafc] focus:border-[#6366f1] focus:outline-none"
                        placeholder="https://api.openai.com/v1/chat/completions"
                      />
                    </div>

                    <div>
                      <label className="block text-[#94a3b8] text-sm mb-1">API Key</label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={customApiKey}
                          onChange={(e) => setCustomApiKey(e.target.value)}
                          className="w-full bg-[#0a0a0f] border border-[#2e2e3a] rounded-lg px-4 py-2 text-[#f8fafc] focus:border-[#6366f1] focus:outline-none pr-10"
                          placeholder="sk-..."
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc]"
                        >
                          {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[#f8fafc] font-medium mb-1">Skill Tree</h3>
                  <p className="text-[#94a3b8] text-sm">
                    Configure AI analysis skills. Each skill adds a specific analysis perspective.
                    Enable/disable skills and customize their prompts.
                  </p>
                </div>
                <button
                  onClick={resetSkillTree}
                  className="px-3 py-1.5 bg-[#1a1a24] border border-[#2e2e3a] rounded-lg text-[#94a3b8] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors text-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset to Default
                </button>
              </div>

              <div className="bg-[#0a0a0f] rounded-lg p-4 max-h-[500px] overflow-y-auto">
                {skillTree.map(rootNode => (
                  <SkillTreeNode
                    key={rootNode.id}
                    node={rootNode}
                    onToggle={toggleSkill}
                    onEdit={editSkill}
                    onAddChild={addChildSkill}
                    onRemove={removeSkill}
                  />
                ))}
              </div>

              <div className="text-sm text-[#94a3b8]">
                <p>Green = Enabled, Gray = Disabled. Click brain icon to toggle.</p>
                <p className="mt-1">Click ⚡ to edit prompt, + to add sub-skill, - to remove.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#2e2e3a]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1a24] border border-[#2e2e3a] rounded-lg text-[#94a3b8] hover:border-[#6366f1] hover:text-[#f8fafc] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#5a5cf0] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}