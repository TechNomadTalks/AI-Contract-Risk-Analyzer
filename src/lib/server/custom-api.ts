import { OllamaAnalysis } from '@/types';
import { getSettings, buildPromptFromSkills, getDefaultSkillTree } from '../database';

export async function analyzeWithCustomApiServer(text: string, clauseType: string, userId: string = 'default'): Promise<OllamaAnalysis | null> {
  const settings = await getSettings(userId);
  
  if (!settings.useCustomApi || !settings.customApiUrl || !settings.customApiKey) {
    return null;
  }
  
  const skillTree = settings.skillTree || getDefaultSkillTree();
  const prompt = buildPromptFromSkills(skillTree, text, clauseType);
  
  try {
    const response = await fetch(settings.customApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.customApiKey}`,
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