import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_BASE_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { connected: false, error: 'Failed to connect to Ollama' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    return NextResponse.json({
      connected: true,
      models: models.map((m: { name: string }) => m.name),
      defaultModel: models[0]?.name || 'llama2',
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
    const body = await request.json();
    const { text, clauseType, model } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      );
    }
    
    const prompt = `You are a legal contract analyst. Analyze the following contract clause and provide a risk assessment.

Clause Type: ${clauseType || 'General'}
Clause Text:
${text.substring(0, 2000)}

Provide your analysis in JSON format:
{
  "summary": "2-3 sentence summary of the clause",
  "riskFactors": ["specific risk factor 1", "risk factor 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.0-1.0
}

Only respond with valid JSON.`;
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama2',
        prompt,
        stream: false,
        format: 'json',
      }),
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Ollama request failed' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    const content = data.response || data.text || '';
    
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        summary: content.substring(0, 200),
        riskFactors: [],
        recommendations: [],
        confidence: 0.3,
      });
    }
  } catch (error) {
    console.error('Ollama API error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
