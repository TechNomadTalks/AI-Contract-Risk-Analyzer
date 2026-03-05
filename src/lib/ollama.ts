import { Clause, OllamaAnalysis, RiskLevel } from '@/types';

const OLLAMA_BASE_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

export async function checkOllamaStatus(): Promise<{ connected: boolean; model?: string; error?: string }> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return { connected: false, error: 'Failed to connect to Ollama' };
    }
    
    const data = await response.json();
    const model = data.models?.[0]?.name || 'llama2';
    
    return { connected: true, model };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

const ANALYSIS_PROMPT = `You are a legal contract analyst. Analyze the following contract clause and provide a risk assessment.

Clause Type: {clauseType}
Clause Text:
{clauseText}

Provide your analysis in JSON format:
{{
  "summary": "2-3 sentence summary of the clause and its implications",
  "riskFactors": ["specific risk factor 1", "specific risk factor 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.0-1.0
}}

Only respond with valid JSON.`;

async function analyzeWithOllama(text: string, clauseType: string): Promise<OllamaAnalysis | null> {
  try {
    const prompt = ANALYSIS_PROMPT
      .replace('{clauseType}', clauseType)
      .replace('{clauseText}', text.substring(0, 2000));
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt,
        stream: false,
        format: 'json',
      }),
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
  const ollamaResult = await analyzeWithOllama(clause.text, clause.type);
  
  if (ollamaResult) {
    return ollamaResult;
  }
  
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
