import { NextRequest, NextResponse } from 'next/server';
import { initializeSettings, checkOllamaStatus, getRecommendedModels, getCurrentSettings, updateOllamaSettings, updateCustomApiSettings, updateSkillTree, analyzeWithOllama as serverAnalyzeWithOllama } from '@/lib/ollama';
import { analyzeWithCustomApiServer } from '@/lib/server/custom-api';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await initializeSettings();
    
    const body = await request.json();
    const { text, clauseType, model, action, settings: bodySettings, skillTree } = body;
    
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
    
    const currentSettings = getCurrentSettings();
    
    if (currentSettings.useCustomApi && currentSettings.customApiUrl) {
      const result = await analyzeWithCustomApiServer(text, clauseType || 'General');
      if (result) return NextResponse.json(result);
    }
    
    const result = await serverAnalyzeWithOllama(text, clauseType || 'General', model || currentSettings.ollamaModel);
    if (result) return NextResponse.json(result);
    
    return NextResponse.json({
      summary: 'Analysis unavailable. Using rule-based fallback.',
      riskFactors: ['AI analysis failed'],
      recommendations: ['Check Ollama connection or configure custom API'],
      confidence: 0.2,
    });
  } catch (error) {
    console.error('Ollama API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}