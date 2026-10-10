import { Clause, OllamaAnalysis, RiskLevel } from '@/types';
import { SkillNode, getSettings, saveSettings, buildPromptFromSkills, getDefaultSkillTree } from './database';
import { z } from 'zod';
import { getClauseConfig } from './risk-config';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const RECOMMENDED_MODELS = [
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

const AnalysisResponseSchema = z.object({
  summary: z.string().min(1).max(1000),
  recommendations: z.array(z.string().min(1).max(500)).max(10),
  topRisks: z.array(z.string().min(1).max(500)).max(10),
  confidence: z.number().min(0).max(1),
});

function parseAndValidateAnalysis(content: string): OllamaAnalysis {
  try {
    const parsed = JSON.parse(content);
    const validated = AnalysisResponseSchema.parse(parsed);
    return validated;
  } catch {
    return {
      summary: content.substring(0, 200),
      recommendations: [],
      topRisks: [],
      confidence: 0.3,
    };
  }
}

let cachedSettings: {
  ollamaUrl: string;
  ollamaModel: string;
  customApiUrl?: string;
  useCustomApi: boolean;
  skillTree: SkillNode[];
} | null = null;

export async function initializeSettings(userId: string = 'default'): Promise<void> {
  try {
    const settings = await getSettings(userId);
    cachedSettings = {
      ollamaUrl: settings.ollamaUrl || DEFAULT_OLLAMA_URL,
      ollamaModel: settings.ollamaModel || 'llama3.1:8b',
      customApiUrl: settings.customApiUrl,
      useCustomApi: settings.useCustomApi || false,
      skillTree: settings.skillTree || getDefaultSkillTree(),
    };
  } catch {
    cachedSettings = {
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: 'llama3.1:8b',
      useCustomApi: false,
      skillTree: getDefaultSkillTree(),
    };
  }
}

export function getCurrentSettings() {
  return cachedSettings || {
    ollamaUrl: DEFAULT_OLLAMA_URL,
    ollamaModel: 'llama3.1:8b',
    useCustomApi: false,
    skillTree: getDefaultSkillTree(),
  };
}

export function getOllamaUrl(): string {
  return getCurrentSettings().ollamaUrl;
}

export function getOllamaModel(): string {
  return getCurrentSettings().ollamaModel;
}

export function getRecommendedModels(): string[] {
  return RECOMMENDED_MODELS;
}

export async function updateOllamaSettings(settings: { url?: string; model?: string }, userId: string = 'default'): Promise<void> {
  if (cachedSettings) {
    if (settings.url) cachedSettings.ollamaUrl = settings.url;
    if (settings.model) cachedSettings.ollamaModel = settings.model;
    await saveSettings(userId, { ollamaUrl: cachedSettings.ollamaUrl, ollamaModel: cachedSettings.ollamaModel });
  }
}

export async function updateCustomApiSettings(settings: { url?: string; enabled?: boolean }, userId: string = 'default'): Promise<void> {
  if (cachedSettings) {
    if (settings.url !== undefined) cachedSettings.customApiUrl = settings.url;
    if (settings.enabled !== undefined) cachedSettings.useCustomApi = settings.enabled;
    await saveSettings(userId, { 
      customApiUrl: cachedSettings.customApiUrl, 
      useCustomApi: cachedSettings.useCustomApi 
    });
  }
}

export async function updateSkillTree(skillTree: SkillNode[], userId: string = 'default'): Promise<void> {
  if (cachedSettings) {
    cachedSettings.skillTree = skillTree;
    await saveSettings(userId, { skillTree });
  }
}

export async function checkOllamaStatus(url?: string): Promise<{ connected: boolean; model?: string; models?: string[]; error?: string }> {
  const baseUrl = url || getOllamaUrl();
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return { connected: false, error: 'Failed to connect to Ollama' };
    }
    
    const data = await response.json();
    const models = data.models || [];
    const modelNames = models.map((m: { name: string }) => m.name);
    
    return { 
      connected: true, 
      model: modelNames[0] || 'llama3.1:8b',
      models: modelNames,
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

export async function analyzeWithOllama(text: string, clauseType: string, model?: string, baseUrl?: string): Promise<OllamaAnalysis | null> {
  const settings = getCurrentSettings();
  const ollamaUrl = baseUrl || settings.ollamaUrl;
  const ollamaModel = model || settings.ollamaModel;
  
  const skillTree = settings.skillTree;
  const prompt = buildPromptFromSkills(skillTree, text, clauseType);
  
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          top_p: 0.9,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.response || data.text || '';
    
    return parseAndValidateAnalysis(content);
  } catch (error) {
    console.error('Ollama analysis error:', error);
    return null;
  }
}

function generateRuleBasedAnalysis(clause: Clause): OllamaAnalysis {
  const config = getClauseConfig(clause.type);
  
  if (!config) {
    return {
      summary: `${clause.type.replace(/_/g, ' ')} clause with ${clause.riskLevel} risk level. Review carefully for potential issues.`,
      recommendations: ['Seek legal counsel'],
      topRisks: clause.riskFactors.length > 0 
        ? clause.riskFactors.map(f => `Contains: "${f}"`)
        : ['Review carefully'],
      confidence: clause.riskLevel === 'high' ? 0.8 : clause.riskLevel === 'medium' ? 0.6 : 0.4,
    };
  }
  
  const specificRisks = clause.riskFactors.length > 0 
    ? clause.riskFactors.map(f => `Contains: "${f}"`)
    : config.fallbackRisks.slice(0, 2);
  
  return {
    summary: `${config.title} clause with ${clause.riskLevel} risk level. ${config.fallbackRisks[0] || 'Review carefully for potential issues.'}`,
    recommendations: config.fallbackRecommendations,
    topRisks: specificRisks,
    confidence: clause.riskLevel === 'high' ? 0.8 : clause.riskLevel === 'medium' ? 0.6 : 0.4,
  };
}

export async function analyzeClause(clause: Clause): Promise<OllamaAnalysis> {
  const settings = getCurrentSettings();
  
  if (settings.useCustomApi && settings.customApiUrl) {
    const response = await fetch('/api/ollama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clause.text,
        clauseType: clause.type,
        action: 'analyze',
      }),
    });
    
    if (response.ok) {
      return response.json();
    }
  }
  
  const ollamaResult = await analyzeWithOllama(clause.text, clause.type);
  if (ollamaResult) return ollamaResult;
  
  return generateRuleBasedAnalysis(clause);
}

export async function analyzeDocument(
  clauses: Clause[],
  onProgress?: (current: number, total: number) => void
): Promise<OllamaAnalysis> {
  if (clauses.length === 0) {
    return {
      summary: 'No significant clauses detected in this document.',
      recommendations: ['Review the full document manually', 'Consider if this is a complete contract'],
      topRisks: [],
      confidence: 0,
    };
  }
  
  const results = await Promise.allSettled(
    clauses.map((clause, index) => 
      analyzeClause(clause).then(result => {
        if (onProgress) onProgress(index + 1, clauses.length);
        return result;
      })
    )
  );
  
  const allRisks: string[] = [];
  const allRecommendations: string[] = [];
  let totalConfidence = 0;
  let successfulAnalyses = 0;
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allRisks.push(...result.value.topRisks);
      allRecommendations.push(...result.value.recommendations);
      totalConfidence += result.value.confidence;
      successfulAnalyses++;
    }
  }
  
  const avgConfidence = successfulAnalyses > 0 ? totalConfidence / successfulAnalyses : 0;
  
  const highRiskClauses = clauses.filter(c => c.riskLevel === 'high');
  const summary = `Analyzed ${clauses.length} clauses. ${highRiskClauses.length} high-risk clause${highRiskClauses.length !== 1 ? 's' : ''} identified requiring attention.`;
  
  const uniqueRisks = [...new Set(allRisks)].slice(0, 5);
  const uniqueRecommendations = [...new Set(allRecommendations)].slice(0, 5);
  
  return {
    summary,
    topRisks: uniqueRisks,
    recommendations: uniqueRecommendations,
    confidence: avgConfidence,
  };
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#22c55e';
  }
}

export function getRiskLevelLabel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}