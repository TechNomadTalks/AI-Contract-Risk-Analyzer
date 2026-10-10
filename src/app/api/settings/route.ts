import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, getDefaultSkillTree, UserSettings } from '@/lib/database';
import { verifyAuthToken } from '@/lib/auth';

function sanitizeSettingsForClient(settings: UserSettings) {
  const { customApiKey, ...safeSettings } = settings;
  return {
    ...safeSettings,
    customApiKey: customApiKey ? '***' : undefined,
    hasCustomApiKey: !!customApiKey,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.uid;
    const settings = await getSettings(userId);
    
    return NextResponse.json(sanitizeSettingsForClient(settings));
  } catch {
    return NextResponse.json(
      { error: 'Failed to get settings' },
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

    const userId = user.uid;
    const body = await request.json();
    const { ...settings } = body;
    
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
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.uid;
    const body = await request.json();
    const { skillTree } = body;
    
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
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.uid;
    
    await saveSettings(userId, { skillTree: getDefaultSkillTree() });
    
    return NextResponse.json({ success: true, skillTree: getDefaultSkillTree() });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reset skill tree' },
      { status: 500 }
    );
  }
}