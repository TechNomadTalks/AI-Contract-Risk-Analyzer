import { NextRequest, NextResponse } from 'next/server';
import { initializeSettings, checkOllamaStatus, getRecommendedModels, getCurrentSettings, updateOllamaSettings, updateCustomApiSettings, updateSkillTree, analyzeClause } from '@/lib/ollama';
import { Clause } from '@/types';

export async function GET() {
  try {
    await initializeSettings();
    const status = await checkOllamaStatus();
    const models = getRecommendedModels();
    
    const settings = getCurrentSettings();
    
    return NextResponse.json({
      connected: status.connected,
      models: status.models || [],
      availableModels: models,
      currentModel: settings.ollamaModel,
      ollamaUrl: settings.ollamaUrl,
      useCustomApi: settings.useCustomApi,
      customApiUrl: settings.customApiUrl,
      skillTree: settings.skillTree,
      error: status.error,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeSettings();
    
    const body = await request.json();
    const { text, clauseType, action, settings: bodySettings, skillTree } = body;
    
    if (action === 'update-settings') {
      if (bodySettings) {
        await updateOllamaSettings(bodySettings);
      }
      if (skillTree) {
        await updateSkillTree(skillTree);
      }
      return NextResponse.json({ success: true });
    }
    
    if (action === 'update-custom-api') {
      if (bodySettings) {
        await updateCustomApiSettings(bodySettings);
      }
      return NextResponse.json({ success: true });
    }
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      );
    }
    
    const clause: Clause = {
      id: `temp-${Date.now()}`,
      documentId: 'temp',
      type: (clauseType as Clause['type']) || 'other',
      text,
      startIndex: 0,
      endIndex: text.length,
      riskLevel: 'low',
      riskFactors: [],
      summary: '',
    };
    
    const result = await analyzeClause(clause);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Ollama API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}