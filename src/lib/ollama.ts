import { Clause, OllamaAnalysis, RiskLevel } from '@/types';
import { SkillNode, getSettings, saveSettings, buildPromptFromSkills, getDefaultSkillTree } from './database';

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

let cachedSettings: {
  ollamaUrl: string;
  ollamaModel: string;
  customApiUrl?: string;
  customApiKey?: string;
  useCustomApi: boolean;
  skillTree: SkillNode[];
} | null = null;

export async function initializeSettings(userId: string = 'default'): Promise<void> {
  try {
    cachedSettings = await getSettings(userId);
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

export async function updateCustomApiSettings(settings: { url?: string; key?: string; enabled?: boolean }, userId: string = 'default'): Promise<void> {
  if (cachedSettings) {
    if (settings.url !== undefined) cachedSettings.customApiUrl = settings.url;
    if (settings.key !== undefined) cachedSettings.customApiKey = settings.key;
    if (settings.enabled !== undefined) cachedSettings.useCustomApi = settings.enabled;
    await saveSettings(userId, { 
      customApiUrl: cachedSettings.customApiUrl, 
      customApiKey: cachedSettings.customApiKey, 
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

async function analyzeWithOllama(text: string, clauseType: string, model?: string, baseUrl?: string): Promise<OllamaAnalysis | null> {
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
      return null;
    }
    
    const data = await response.json();
    const content = data.response || data.text || '';
    
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || '',
        recommendations: parsed.recommendations || [],
        topRisks: parsed.riskFactors || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch {
      return {
        summary: content.substring(0, 200),
        recommendations: [],
        topRisks: [],
        confidence: 0.3,
      };
    }
  } catch (error) {
    console.error('Ollama analysis error:', error);
    return null;
  }
}

async function analyzeWithCustomApi(text: string, clauseType: string): Promise<OllamaAnalysis | null> {
  const settings = getCurrentSettings();
  
  if (!settings.useCustomApi || !settings.customApiUrl) {
    return null;
  }
  
  const skillTree = settings.skillTree;
  const prompt = buildPromptFromSkills(skillTree, text, clauseType);
  
  try {
    const response = await fetch(settings.customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.customApiKey ? { 'Authorization': `Bearer ${settings.customApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: settings.customApiUrl.includes('openai') ? 'gpt-4' : 'custom',
        messages: [
          { role: 'system', content: 'You are an expert legal contract analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(120000),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.response || data.text || '';
    
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || '',
        recommendations: parsed.recommendations || [],
        topRisks: parsed.riskFactors || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch {
      return {
        summary: content.substring(0, 200),
        recommendations: [],
        topRisks: [],
        confidence: 0.3,
      };
    }
  } catch (error) {
    console.error('Custom API analysis error:', error);
    return null;
  }
}

function generateRuleBasedAnalysis(clause: Clause): OllamaAnalysis {
  const typeRiskInfo: Record<string, { risks: string[]; recommendations: string[] }> = {
    termination: {
      risks: ['Unilateral termination rights', 'Short notice periods', 'Termination without cause'],
      recommendations: ['Negotiate reasonable notice periods', 'Require written notice', 'Include termination for convenience clauses'],
    },
    liability: {
      risks: ['Unlimited liability exposure', 'No caps on damages', 'Broad indemnification'],
      recommendations: ['Negotiate liability caps', 'Include consequential damage exclusions', 'Carve-out exceptions'],
    },
    payment: {
      risks: ['Long payment terms', 'Late fee provisions', 'Unlimited payment obligations'],
      recommendations: ['Negotiate net 30 terms', 'Limit late fees', 'Include payment milestones'],
    },
    confidentiality: {
      risks: ['Perpetual obligations', 'Broad definitions', 'Unlimited scope'],
      recommendations: ['Add time limits', 'Narrow definition of confidential info', 'Include exclusions'],
    },
    intellectual_property: {
      risks: ['IP ownership transfer', 'Broad license grants', 'Work-for-hire provisions'],
      recommendations: ['Clarify IP ownership', 'Limit license scope', 'Negotiate retainment rights'],
    },
    force_majeure: {
      risks: ['Broad force majeure definitions', 'Pandemic exclusions', 'Limited remedies'],
      recommendations: ['Narrow definition', 'Include specific events', 'Add termination rights'],
    },
    governing_law: {
      risks: ['Unfavorable jurisdiction', 'Mandatory arbitration', 'Foreign law'],
      recommendations: ['Negotiate home jurisdiction', 'Specify arbitration rules', 'Choose familiar law'],
    },
    warranty: {
      risks: ['Broad disclaimers', 'No warranty express', 'Extended warranty periods'],
      recommendations: ['Add express warranties', 'Limit disclaimer scope', 'Negotiate warranty period'],
    },
    assignment: {
      risks: ['Unrestricted assignment', 'Assignment without consent', 'Automatic assignment'],
      recommendations: ['Require consent for assignment', 'Add notice requirements', 'Limit assignment rights'],
    },
    amendments: {
      risks: ['Unilateral amendments', 'No amendment process', 'Oral modification allowed'],
      recommendations: ['Require written amendments', 'Include change process', 'Specify approval requirements'],
    },
  };
  
  const info = typeRiskInfo[clause.type] || { risks: ['Review carefully'], recommendations: ['Seek legal counsel'] };
  
  const specificRisks = clause.riskFactors.length > 0 
    ? clause.riskFactors.map(f => `Contains: "${f}"`)
    : info.risks.slice(0, 2);
  
  return {
    summary: `${clause.type.replace(/_/g, ' ')} clause with ${clause.riskLevel} risk level. ${info.risks[0] || 'Review carefully for potential issues.'}`,
    recommendations: info.recommendations,
    topRisks: specificRisks,
    confidence: clause.riskLevel === 'high' ? 0.8 : clause.riskLevel === 'medium' ? 0.6 : 0.4,
  };
}

export async function analyzeClause(clause: Clause): Promise<OllamaAnalysis> {
  const settings = getCurrentSettings();
  
  if (settings.useCustomApi && settings.customApiUrl) {
    const customResult = await analyzeWithCustomApi(clause.text, clause.type);
    if (customResult) return customResult;
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
  
  const allRisks: string[] = [];
  const allRecommendations: string[] = [];
  let totalConfidence = 0;
  
  for (let i = 0; i < clauses.length; i++) {
    const analysis = await analyzeClause(clauses[i]);
    allRisks.push(...analysis.topRisks);
    allRecommendations.push(...analysis.recommendations);
    totalConfidence += analysis.confidence;
    
    if (onProgress) {
      onProgress(i + 1, clauses.length);
    }
  }
  
  const avgConfidence = totalConfidence / clauses.length;
  
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