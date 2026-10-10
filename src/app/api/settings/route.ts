import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, getDefaultSkillTree } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    
    const settings = await getSettings(userId);
    
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'default', ...settings } = body;
    
    await saveSettings(userId, settings);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'default', skillTree } = body;
    
    if (!skillTree) {
      return NextResponse.json(
        { error: 'Missing skillTree' },
        { status: 400 }
      );
    }
    
    await saveSettings(userId, { skillTree });
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update skill tree' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    
    await saveSettings(userId, { skillTree: getDefaultSkillTree() });
    
    return NextResponse.json({ success: true, skillTree: getDefaultSkillTree() });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reset skill tree' },
      { status: 500 }
    );
  }
}